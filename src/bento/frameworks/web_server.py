"""BentoWebServer: Zero-dependency embedded HTTP server serving REST API and React dashboard."""
from __future__ import annotations
import datetime
import hashlib
import json
import mimetypes
import os
import re
import socket
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from dataclasses import asdict

from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.domain.models import Assertion, AssertionType, MemoryLesson, Scenario, TraceEvent
from bento.domain.ports import ExecutionGateway, MemoryGateway, StorageGateway, TraceGateway
from bento.domain.rules import (
    build_memory_graph,
    calculate_telemetry_metrics,
    detect_recurring_skill_patterns,
    evaluate_assertion,
    generate_unicode_sparkline,
    validate_scenario,
)
from bento.frameworks.bg_runner import BackgroundTaskRunner
from bento.use_cases.dream_cycle import DreamCycleUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class BentoApiHandler(BaseHTTPRequestHandler):
    bg_runner: BackgroundTaskRunner
    memory_gateway: MemoryGateway
    trace_gateway: TraceGateway | None
    storage_gateway: StorageGateway
    execution_gateway: ExecutionGateway | None = None
    run_suite_uc: RunSuiteUseCase
    dream_uc: DreamCycleUseCase
    static_dir: Path
    workspace_dir: str | None = None
    start_time: float
    # SEC-11 & REL-02: Bound concurrent SSE connections with thread-safe lock
    _active_sse_connections: int = 0
    _sse_lock = threading.Lock()
    _memory_lock = threading.Lock()
    MAX_SSE_CONNECTIONS: int = 10

    def setup(self) -> None:
        super().setup()
        try:
            # SEC-13: Set 15-second socket timeout to prevent Slowloris thread starvation
            self.request.settimeout(15.0)
        except Exception:
            pass

    def address_string(self) -> str:
        # Avoid blocking reverse DNS lookups (socket.getfqdn) on every request
        return str(self.client_address[0])

    def log_message(self, format: str, *args: any) -> None:
        # Suppress standard logging to avoid stderr pollution in tests and ambient monitoring
        pass

    def _is_safe_host_header(self) -> bool:
        """Validate Host header against DNS rebinding (SEC-09)."""
        host_header = self.headers.get("Host", "")
        if not host_header:
            return True
        host_val = host_header.split(":")[0].lower().strip("[]")
        return self._is_safe_host(host_val)

    def _is_allowed_origin(self) -> bool:
        """Enforce strict CORS origin whitelist (SEC-09)."""
        origin = self.headers.get("Origin")
        if not origin:
            return True
        try:
            parsed = urlparse(origin)
            origin_host = (parsed.hostname or "").lower().strip("[]")
            if origin_host in ("localhost", "127.0.0.1", "::1"):
                return True

            host_header = self.headers.get("Host", "")
            if host_header:
                host_val = host_header.split(":")[0].lower().strip("[]")
                if origin_host == host_val and self._is_safe_host(host_val):
                    return True

            return False
        except Exception:
            return False

    @staticmethod
    def _is_safe_host(hostname: str) -> bool:
        if not hostname:
            return False
        if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0") or hostname.endswith(".local"):
            return True
        try:
            import ipaddress
            ip = ipaddress.ip_address(hostname)
            return ip.is_loopback or ip.is_private
        except ValueError:
            return False

    def _get_cors_origin(self) -> str | None:
        origin = self.headers.get("Origin")
        if not origin:
            return None
        if self._is_allowed_origin():
            return origin
        return None

    def _send_json(self, data: any, status: int = 200) -> None:
        payload = json.dumps(data, default=lambda o: getattr(o, "__dict__", str(o))).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        # SEC-04: Enforce clickjacking and MIME-sniffing defenses
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "frame-ancestors 'none'")
        cors_origin = self._get_cors_origin()
        if cors_origin:
            self.send_header("Access-Control-Allow-Origin", cors_origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        cors_origin = self._get_cors_origin()
        if cors_origin:
            self.send_response(HTTPStatus.NO_CONTENT)
            self.send_header("Access-Control-Allow-Origin", cors_origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.send_header("Vary", "Origin")
            self.end_headers()
        else:
            self.send_response(HTTPStatus.FORBIDDEN)
            self.end_headers()

    def do_GET(self):
        if not self._is_safe_host_header():
            self._send_json({"error": "Forbidden Host"}, status=403)
            return

        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        if path == "/api/status":
            memory = self.memory_gateway.load_memory()
            tasks = self.bg_runner.list_tasks()
            active_tasks = [
                t for t in tasks
                if (getattr(t, "status", None) or (t.get("status") if isinstance(t, dict) else None)) == "RUNNING"
            ]
            traces = self.trace_gateway.load_recent_traces(100) if self.trace_gateway else []
            scenarios = self._load_all_scenarios()

            data = {
                "status": "ACTIVE",
                "uptime_sec": int(time.monotonic() - self.start_time),
                "active_tasks_count": len(active_tasks),
                "total_lessons_count": len(memory.lessons),
                "recent_traces_count": len(traces),
                "benchmarks_count": len(scenarios),
                "cwd": os.getcwd(),
            }
            return self._send_json(data)

        elif path == "/api/bg":
            tasks = self.bg_runner.list_tasks()
            data = []
            for t in tasks:
                if isinstance(t, dict):
                    data.append({
                        "task_id": t.get("id", t.get("task_id", "")),
                        "tag": t.get("tag", "task"),
                        "command": t.get("command", ""),
                        "pid": t.get("pid", 0),
                        "status": t.get("status", "STOPPED"),
                        "start_time": t.get("started_at", t.get("start_time", "")),
                        "duration_sec": t.get("duration_sec", 0),
                        "log_file": str(t.get("log_file", "")),
                        "exit_code": t.get("exit_code"),
                    })
                else:
                    data.append({
                        "task_id": getattr(t, "task_id", getattr(t, "id", "")),
                        "tag": getattr(t, "tag", "task"),
                        "command": getattr(t, "command", ""),
                        "pid": getattr(t, "pid", 0),
                        "status": getattr(t, "status", "STOPPED"),
                        "start_time": getattr(t, "start_time", getattr(t, "started_at", "")),
                        "duration_sec": getattr(t, "duration_sec", 0),
                        "log_file": str(getattr(t, "log_file", "")),
                        "exit_code": getattr(t, "exit_code", None),
                    })
            return self._send_json(data)

        elif path.startswith("/api/bg/") and path.endswith("/logs"):
            # /api/bg/<id>/logs
            parts = path.split("/")
            if len(parts) != 5 or not re.match(r"^bg-[a-zA-Z0-9_\-]+$", parts[3]):
                return self._send_json({"error": "Invalid task ID"}, status=400)
            task_id = parts[3]
            logs = self.bg_runner.get_logs(task_id, lines=200)
            return self._send_json({"task_id": task_id, "logs": logs})

        elif path.startswith("/api/bg/") and path.endswith("/stream"):
            # /api/bg/<id>/stream
            parts = path.split("/")
            if len(parts) != 5 or not re.match(r"^bg-[a-zA-Z0-9_\-]+$", parts[3]):
                return self._send_json({"error": "Invalid task ID"}, status=400)
            # SEC-11 & REL-02: Atomically check and reserve SSE connection slot
            with BentoApiHandler._sse_lock:
                if BentoApiHandler._active_sse_connections >= BentoApiHandler.MAX_SSE_CONNECTIONS:
                    return self._send_json({"error": "Too many concurrent SSE connections"}, status=429)
                BentoApiHandler._active_sse_connections += 1
            task_id = parts[3]
            self._stream_task_logs(task_id, query_params=parsed.query)
            return

        elif path == "/api/memory/graph":
            memory = self.memory_gateway.load_memory()
            scenarios = self._load_all_scenarios()
            graph = build_memory_graph(memory, scenarios)
            return self._send_json(asdict(graph))

        elif path == "/api/memory":
            memory = self.memory_gateway.load_memory()
            data = [
                {
                    "id": l.id,
                    "title": l.title,
                    "category": l.category,
                    "context": l.context,
                    "rule": l.rule,
                    "anti_pattern": l.anti_pattern,
                    "discovery_date": l.discovery_date,
                    "tags": l.tags,
                    "source_scenario": l.source_scenario,
                }
                for l in memory.lessons
            ]
            return self._send_json(data)

        elif path == "/api/traces":
            traces = self.trace_gateway.load_recent_traces(50) if self.trace_gateway else []
            skills = detect_recurring_skill_patterns(traces)
            data = {
                "traces": [
                    {
                        "timestamp": e.timestamp,
                        "task_name": e.task_name,
                        "iteration": e.iteration,
                        "event_type": e.event_type,
                        "prompt_sent": e.prompt_sent,
                        "agent_output": e.agent_output,
                        "exit_code": e.exit_code,
                        "passed": e.passed,
                        "failed_assertions": e.failed_assertions,
                        "tags": e.tags,
                    }
                    for e in traces
                ],
                "skills": [
                    {
                        "name": s.name,
                        "description": s.description,
                        "trigger_tags": s.trigger_tags,
                        "steps": s.steps,
                    }
                    for s in skills
                ],
            }
            return self._send_json(data)

        elif path == "/api/benchmarks":
            scenarios = self._load_all_scenarios()
            data = [ScenarioParser.to_dict(s) for s in scenarios]
            return self._send_json(data)

        elif path == "/api/telemetry":
            traces = self.trace_gateway.load_recent_traces(100) if self.trace_gateway else []
            metrics = calculate_telemetry_metrics(traces)
            sparkline = generate_unicode_sparkline(metrics.recent_latencies)
            return self._send_json({
                "metrics": asdict(metrics),
                "sparkline": sparkline,
            })

        elif path == "/api/system/vitals":
            import resource
            import sys
            rusage = resource.getrusage(resource.RUSAGE_SELF)
            rss_bytes = rusage.ru_maxrss if sys.platform == "darwin" else rusage.ru_maxrss * 1024
            rss_mb = round(rss_bytes / (1024 * 1024), 1)

            try:
                load_avg = list(os.getloadavg())
            except (AttributeError, OSError):
                load_avg = [0.0, 0.0, 0.0]

            tasks = self.bg_runner.list_tasks()
            active_tasks = [
                t for t in tasks
                if (getattr(t, "status", None) or (t.get("status") if isinstance(t, dict) else None)) == "RUNNING"
            ]

            uptime = round(time.monotonic() - self.start_time, 1)

            data = {
                "rss_mb": rss_mb,
                "load_avg": [round(x, 2) for x in load_avg],
                "active_daemons": len(active_tasks),
                "total_tasks": len(tasks),
                "active_sse": BentoApiHandler._active_sse_connections,
                "uptime_sec": uptime,
            }
            return self._send_json(data)

        elif path == "/api/memory/export":
            from urllib.parse import parse_qs
            qs = parse_qs(parsed.query)
            export_format = qs.get("format", ["agents_md"])[0].lower()

            memory = self.memory_gateway.load_memory()
            if export_format == "json":
                data = [
                    {
                        "id": l.id,
                        "title": l.title,
                        "category": l.category,
                        "context": l.context,
                        "rule": l.rule,
                        "anti_pattern": l.anti_pattern,
                        "discovery_date": l.discovery_date,
                        "tags": l.tags,
                    }
                    for l in memory.lessons
                ]
                return self._send_json(data)
            else:
                lines = [
                    "# Bento Institutional Memory Bank",
                    "",
                    "Rules seasoned from automated harness testing, verification rigs, and self-healing loops.",
                    "",
                ]
                categories = sorted(set(l.category for l in memory.lessons))
                for cat in categories:
                    lines.append(f"## {cat.title()}")
                    lines.append("")
                    cat_lessons = [l for l in memory.lessons if l.category == cat]
                    for l in cat_lessons:
                        lines.append(f"### {l.title} (`{l.id}`)")
                        lines.append(f"- **Rule**: {l.rule}")
                        if l.anti_pattern:
                            lines.append(f"- **Anti-Pattern**: {l.anti_pattern}")
                        if l.tags:
                            lines.append(f"- **Tags**: {', '.join(l.tags)}")
                        lines.append("")
                export_text = "\n".join(lines)
                self.send_response(200)
                self.send_header("Content-Type", "text/markdown; charset=utf-8")
                self.send_header("Content-Length", str(len(export_text.encode("utf-8"))))
                self.send_header("X-Frame-Options", "DENY")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.send_header("Content-Security-Policy", "frame-ancestors 'none'")
                cors_origin = self._get_cors_origin()
                if cors_origin:
                    self.send_header("Access-Control-Allow-Origin", cors_origin)
                self.end_headers()
                self.wfile.write(export_text.encode("utf-8"))
                return

        # Fallback: Reject unmatched API routes with 404 JSON (SEC-11)
        if path.startswith("/api/"):
            self._send_json({"error": f"API endpoint not found: {path}"}, status=404)
            return

        # Fallback: Serve Static Files (React build)
        self._serve_static_file(parsed.path)

    def do_POST(self):
        if not self._is_safe_host_header() or not self._is_allowed_origin():
            self.send_error(403, "Cross-Origin Forbidden")
            return

        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        raw_len = self.headers.get("Content-Length", "0")
        try:
            content_len = max(0, int(str(raw_len).strip()))
        except (ValueError, TypeError):
            self._send_json({"error": "Invalid Content-Length header"}, status=400)
            return

        MAX_BODY_SIZE = 10 * 1024 * 1024  # 10 MB — SEC-10: Prevent OOM via unbounded payload
        if content_len > MAX_BODY_SIZE:
            self._send_json({"error": "Payload Too Large", "max_bytes": MAX_BODY_SIZE}, status=413)
            return
        try:
            body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        except (UnicodeDecodeError, ValueError):
            self._send_json({"error": "Malformed UTF-8 body"}, status=400)
            return

        try:
            payload = json.loads(body) if body else {}
        except Exception:
            payload = {}

        if path == "/api/bg/run":
            cmd = payload.get("command", "").strip()
            tag = payload.get("tag", "task").strip()
            if not cmd:
                return self._send_json({"error": "Command is required"}, status=400)
            task = self.bg_runner.start_task(cmd, tag=tag)
            task_id = task.get("id", getattr(task, "task_id", "")) if isinstance(task, dict) else getattr(task, "task_id", "")
            pid = task.get("pid", getattr(task, "pid", 0)) if isinstance(task, dict) else getattr(task, "pid", 0)
            return self._send_json({"started": True, "task_id": task_id, "pid": pid})

        elif path.startswith("/api/bg/") and path.endswith("/kill"):
            # /api/bg/<id>/kill
            parts = path.split("/")
            if len(parts) != 5 or not re.match(r"^bg-[a-zA-Z0-9_\-]+$", parts[3]):
                return self._send_json({"error": "Invalid task ID"}, status=400)
            task_id = parts[3]
            killed = self.bg_runner.kill_task(task_id)
            return self._send_json({"task_id": task_id, "killed": killed})

        elif path == "/api/benchmarks/run":
            scenarios = self._load_all_scenarios()
            suite_res = self.run_suite_uc.execute(scenarios, suite_name="Bento Live Battery")

            if self.trace_gateway:
                for s, r in zip(scenarios, suite_res.scenario_results):
                    failed_msgs = [
                        sr.error_message
                        for sr in r.step_results
                        if sr.error_message
                    ]
                    event = TraceEvent(
                        timestamp=datetime.datetime.now().isoformat(),
                        task_name=r.scenario_name,
                        iteration=1,
                        event_type="web_benchmark_run",
                        prompt_sent="Web Dashboard Bento Live Battery",
                        agent_output=f"Passed: {r.passed}",
                        exit_code=0 if r.passed else 1,
                        passed=r.passed,
                        failed_assertions=failed_msgs,
                        tags=s.tags,
                    )
                    trace_fn = getattr(self.trace_gateway, "append_trace_event", getattr(self.trace_gateway, "record_trace", None))
                    if trace_fn:
                        trace_fn(event)

            return self._send_json({
                "suite_name": suite_res.suite_name,
                "passed": suite_res.passed,
                "pass_rate": suite_res.pass_rate,
                "total_scenarios": suite_res.total_scenarios,
                "passed_scenarios": suite_res.passed_scenarios,
                "total_duration_ms": suite_res.total_duration_ms,
                "results": [
                    {
                        "scenario_name": r.scenario_name,
                        "passed": r.passed,
                        "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                        "duration_ms": r.total_duration_ms,
                        "step_results": [
                            {
                                "step_name": sr.step_name,
                                "command": sr.command,
                                "status": sr.status.value if hasattr(sr.status, "value") else str(sr.status),
                                "exit_code": sr.exit_code,
                                "stdout": sr.stdout,
                                "stderr": sr.stderr,
                                "duration_ms": sr.duration_ms,
                                "error_message": sr.error_message,
                            }
                            for sr in r.step_results
                        ],
                    }
                    for r in suite_res.scenario_results
                ],
            })

        elif path in ("/api/bg/prune", "/api/bg/sweep"):
            pruned_count = self.bg_runner.prune_tasks(stopped_only=True)
            return self._send_json({"pruned_tasks_count": pruned_count})

        elif path == "/api/memory/add":
            title = str(payload.get("title", "")).strip()
            rule = str(payload.get("rule", "")).strip()
            category = str(payload.get("category", "general")).strip() or "general"
            anti_pattern = str(payload.get("anti_pattern", "")).strip()
            tags_raw = payload.get("tags")
            if isinstance(tags_raw, list):
                tags = [str(t).strip()[:30] for t in tags_raw if str(t).strip()][:20]
            elif isinstance(tags_raw, str) and tags_raw.strip():
                tags = [t.strip()[:30] for t in tags_raw.split(",") if t.strip()][:20]
            else:
                tags = [category[:30]]

            if not title or not rule:
                return self._send_json({"error": "Title and rule are required fields."}, status=400)
            if len(title) > 200:
                return self._send_json({"error": "Title exceeds maximum length of 200 characters."}, status=400)
            if len(rule) > 2000:
                return self._send_json({"error": "Rule exceeds maximum length of 2000 characters."}, status=400)
            if len(anti_pattern) > 2000:
                return self._send_json({"error": "Anti-pattern exceeds maximum length of 2000 characters."}, status=400)
            if len(category) > 50:
                return self._send_json({"error": "Category exceeds maximum length of 50 characters."}, status=400)

            h = hashlib.sha256(f"{title}_{rule}".encode()).hexdigest()[:8]
            lesson = MemoryLesson(
                id=f"MEM-{h.upper()}",
                title=title,
                category=category,
                context="Added via Bento Web Dashboard",
                rule=rule,
                anti_pattern=anti_pattern,
                discovery_date=datetime.datetime.now().strftime("%Y-%m-%d"),
                tags=tags,
            )
            # SEC-14: Concurrency lock serializing memory persistence to avoid lost updates
            with BentoApiHandler._memory_lock:
                bank = self.memory_gateway.load_memory()
                updated_bank = bank.add_lesson(lesson)
                self.memory_gateway.save_memory(updated_bank)

            return self._send_json({
                "success": True,
                "lesson": {
                    "id": lesson.id,
                    "title": lesson.title,
                    "category": lesson.category,
                    "context": lesson.context,
                    "rule": lesson.rule,
                    "anti_pattern": lesson.anti_pattern,
                    "discovery_date": lesson.discovery_date,
                    "tags": lesson.tags,
                }
            }, status=201)

        elif path == "/api/benchmarks/run-one":
            scenario_name = str(payload.get("name", "")).strip()
            if not scenario_name:
                return self._send_json({"error": "Scenario name is required"}, status=400)

            scenarios = self._load_all_scenarios()
            target_scenario = next((s for s in scenarios if s.name == scenario_name), None)
            if not target_scenario:
                return self._send_json({"error": f"Scenario '{scenario_name}' not found"}, status=404)

            scenario_uc = getattr(self.run_suite_uc, "_run_scenario_use_case", getattr(self.run_suite_uc, "_run_scenario", None))
            if not scenario_uc:
                return self._send_json({"error": "Scenario runner use case not configured."}, status=500)

            scenario_res = scenario_uc.execute(target_scenario)

            if self.trace_gateway:
                failed_msgs = [
                    sr.error_message
                    for sr in scenario_res.step_results
                    if sr.error_message
                ]
                event = TraceEvent(
                    timestamp=datetime.datetime.now().isoformat(),
                    task_name=scenario_res.scenario_name,
                    iteration=1,
                    event_type="web_benchmark_single_run",
                    prompt_sent=f"Web Dashboard Single Tasting: {target_scenario.name}",
                    agent_output=f"Passed: {scenario_res.passed}",
                    exit_code=0 if scenario_res.passed else 1,
                    passed=scenario_res.passed,
                    failed_assertions=failed_msgs,
                    tags=target_scenario.tags,
                )
                trace_fn = getattr(self.trace_gateway, "append_trace_event", getattr(self.trace_gateway, "record_trace", None))
                if trace_fn:
                    trace_fn(event)

            data = {
                "scenario_name": scenario_res.scenario_name,
                "passed": scenario_res.passed,
                "total_duration_ms": scenario_res.total_duration_ms,
                "step_results": [
                    {
                        "step_name": sr.step_name,
                        "status": sr.status.value,
                        "error_message": sr.error_message,
                    }
                    for sr in scenario_res.step_results
                ],
            }
            return self._send_json(data)

        elif path == "/api/dream":
            dream_res = self.dream_uc.execute(benchmarks_dir="examples", harvest_traces=True)
            data = {
                "consolidated_lessons_count": dream_res.consolidated_lessons_count,
                "new_lessons_discovered": dream_res.new_lessons_discovered,
                "crystallized_skills_count": len(dream_res.crystallized_skills),
                "total_duration_ms": dream_res.total_duration_ms,
                "all_passed": dream_res.suite_result.all_passed,
            }
            return self._send_json(data)

        elif path == "/api/benchmarks/create":
            name = str(payload.get("name", "")).strip()
            safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", name).lower()
            if not safe_name:
                return self._send_json({"error": "Valid scenario name is required."}, status=400)

            try:
                scenario = ScenarioParser.from_dict(payload)
                validation_errors = validate_scenario(scenario)
                if validation_errors:
                    return self._send_json({"error": "Scenario validation failed", "details": validation_errors}, status=400)
            except Exception as e:
                return self._send_json({"error": f"Invalid scenario format: {e}"}, status=400)

            workspace_root = (Path(self.workspace_dir) if self.workspace_dir else Path.cwd()).resolve()
            benchmarks_dir = workspace_root / "benchmarks"
            benchmarks_dir.mkdir(parents=True, exist_ok=True)
            target_file = benchmarks_dir / f"{safe_name}.json"
            exists_fn = getattr(self.storage_gateway, "file_exists", getattr(self.storage_gateway, "exists", None))
            already_exists = exists_fn(str(target_file)) if exists_fn else target_file.exists()
            if already_exists and not payload.get("overwrite", False):
                return self._send_json({
                    "error": f"Scenario '{safe_name}.json' already exists. Pass 'overwrite': true to replace."
                }, status=409)

            json_payload = ScenarioParser.to_json(scenario)
            self.storage_gateway.write_text(str(target_file), json_payload)

            return self._send_json({
                "success": True,
                "path": str(target_file),
                "scenario": ScenarioParser.to_dict(scenario),
            }, status=201)

        elif path == "/api/benchmarks/preflight":
            command = str(payload.get("command", "")).strip()
            if not command:
                return self._send_json({"error": "Command is required for pre-flight test."}, status=400)

            cwd = payload.get("cwd")
            # SEC-12: Enforce workspace boundary on cwd to prevent path traversal
            if cwd:
                try:
                    resolved_cwd = Path(cwd).resolve()
                    workspace_root = (Path(self.workspace_dir) if self.workspace_dir else Path.cwd()).resolve()
                    if not resolved_cwd.is_relative_to(workspace_root):
                        return self._send_json({"error": "Preflight cwd must remain within the workspace boundary."}, status=400)
                    cwd = str(resolved_cwd)
                except Exception:
                    return self._send_json({"error": "Invalid cwd path provided."}, status=400)

            # REL-07: Safe timeout parsing and bounding
            try:
                timeout_sec = min(max(float(payload.get("timeout_sec", 10.0)), 0.5), 60.0)
            except (ValueError, TypeError):
                timeout_sec = 10.0

            # SEC-08 & SEC-09: Block dangerous environment variable injection
            BLOCKED_ENV_KEYS = {
                "LD_PRELOAD", "LD_LIBRARY_PATH", "DYLD_INSERT_LIBRARIES",
                "DYLD_LIBRARY_PATH", "PATH", "PYTHONPATH", "SHELL", "IFS"
            }
            raw_env = payload.get("env", {})
            safe_env = (
                {k: str(v) for k, v in raw_env.items() if k not in BLOCKED_ENV_KEYS}
                if isinstance(raw_env, dict)
                else {}
            )

            assertions_raw = payload.get("assertions", [])
            assertions: list[Assertion] = []
            for a_data in assertions_raw:
                a_type_str = str(a_data.get("type", "EQUALS")).upper()
                try:
                    a_type = AssertionType(a_type_str)
                except ValueError:
                    return self._send_json({"error": f"Invalid assertion type '{a_type_str}'."}, status=400)
                assertions.append(
                    Assertion(
                        type=a_type,
                        expected=a_data.get("expected"),
                        target_field=str(a_data.get("target_field", "stdout")),
                        description=str(a_data.get("description", "")),
                    )
                )

            # BUG-07: Resolve execution gateway across production and test harnesses
            exec_gw = getattr(self, "execution_gateway", None)
            if not exec_gw:
                scenario_uc = getattr(self.run_suite_uc, "_run_scenario_use_case", getattr(self.run_suite_uc, "_run_scenario", None))
                if scenario_uc:
                    exec_gw = getattr(scenario_uc, "_execution_gateway", None)

            if not exec_gw:
                return self._send_json({"error": "Execution gateway not configured."}, status=500)

            try:
                exit_code, stdout, stderr, duration_ms = exec_gw.execute_command(
                    command=command,
                    cwd=cwd,
                    env=safe_env,
                    timeout_sec=timeout_sec,
                )
            except Exception as e:
                return self._send_json({"error": f"Pre-flight command failed to run: {e}"}, status=500)

            output_data = {
                "stdout": stdout,
                "stderr": stderr,
                "exit_code": exit_code,
                "duration_ms": duration_ms,
            }

            results = []
            all_passed = True
            if assertions:
                for a in assertions:
                    ares = evaluate_assertion(a, output_data)
                    if not ares.passed:
                        all_passed = False
                    results.append({
                        "type": ares.assertion.type.value if hasattr(ares.assertion.type, "value") else str(ares.assertion.type),
                        "target_field": ares.assertion.target_field,
                        "expected": ares.assertion.expected,
                        "actual_value": ares.actual_value,
                        "passed": ares.passed,
                        "error_message": ares.message if not ares.passed else None,
                    })
            else:
                passed = (exit_code == 0)
                all_passed = passed
                results.append({
                    "type": "EXIT_CODE_EQUALS",
                    "target_field": "exit_code",
                    "expected": 0,
                    "actual_value": exit_code,
                    "passed": passed,
                    "error_message": None if passed else f"Expected exit code 0, got {exit_code}",
                })

            return self._send_json({
                "command": command,
                "exit_code": exit_code,
                "stdout": stdout,
                "stderr": stderr,
                "duration_ms": duration_ms,
                "all_passed": all_passed,
                "assertion_results": results,
            })

        elif path == "/api/arena/match":
            challenger = payload.get("challenger")
            defender = payload.get("defender")
            metric = payload.get("metric", "pass_rate")
            if not challenger or not defender:
                return self._send_json({"error": "Both 'challenger' and 'defender' paths are required."}, status=400)

            # SEC-16: Workspace boundary and regular file validation
            workspace_root = Path(getattr(self, "workspace_dir", None) or Path.cwd()).resolve()
            exists_fn = getattr(self.storage_gateway, "file_exists", getattr(self.storage_gateway, "exists", None))

            for path_key, path_val in [("challenger", challenger), ("defender", defender)]:
                if not isinstance(path_val, str) or not path_val.strip():
                    return self._send_json({"error": f"Invalid path for '{path_key}'."}, status=400)
                p = Path(path_val)
                resolved = (workspace_root / p).resolve() if not p.is_absolute() else p.resolve()
                if not resolved.is_relative_to(workspace_root):
                    return self._send_json({"error": f"Path traversal detected: '{path_val}' escapes workspace boundary."}, status=400)
                if resolved.exists():
                    if not resolved.is_file():
                        return self._send_json({"error": f"Invalid scenario contract: '{path_val}' is not a regular file."}, status=400)
                    if hasattr(os.path, "getsize") and resolved.stat().st_size > 2 * 1024 * 1024:
                        return self._send_json({"error": f"Scenario contract '{path_val}' exceeds 2MB limit."}, status=400)
                elif exists_fn:
                    if not (exists_fn(str(resolved)) or exists_fn(path_val)):
                        return self._send_json({"error": f"Scenario contract '{path_val}' not found."}, status=404)

            from bento.domain.models import ArenaMatchup
            from bento.use_cases.arena_match import RunArenaMatchUseCase

            scenario_uc = getattr(self.run_suite_uc, "_run_scenario_use_case", getattr(self.run_suite_uc, "_run_scenario", None))
            if not scenario_uc:
                from bento.use_cases.run_scenario import RunScenarioUseCase
                exec_gw = getattr(self, "execution_gateway", None)
                if not exec_gw:
                    from bento.frameworks.subprocess_executor import SubprocessExecutionGateway
                    exec_gw = SubprocessExecutionGateway()
                scenario_uc = RunScenarioUseCase(execution_gateway=exec_gw)

            arena_uc = RunArenaMatchUseCase(
                storage_gateway=self.storage_gateway,
                run_scenario_use_case=scenario_uc,
                trace_gateway=self.trace_gateway,
            )
            try:
                scorecard = arena_uc.execute(ArenaMatchup(challenger=challenger, defender=defender, metric=metric))
                return self._send_json({
                    "challenger_name": scorecard.challenger_name,
                    "defender_name": scorecard.defender_name,
                    "challenger_passed": scorecard.challenger_passed,
                    "challenger_failed": scorecard.challenger_failed,
                    "challenger_total_steps": scorecard.challenger_total_steps,
                    "challenger_duration_ms": scorecard.challenger_duration_ms,
                    "defender_passed": scorecard.defender_passed,
                    "defender_failed": scorecard.defender_failed,
                    "defender_total_steps": scorecard.defender_total_steps,
                    "defender_duration_ms": scorecard.defender_duration_ms,
                    "winner": scorecard.winner,
                    "metric_used": scorecard.metric_used,
                    "margin": scorecard.margin,
                })
            except Exception as e:
                return self._send_json({"error": f"Arena matchup failed: {e}"}, status=400)

        return self._send_json({"error": "Route not found"}, status=404)

    def _load_all_scenarios(self) -> list[Scenario]:
        scenarios: list[Scenario] = []
        for check_dir in ["benchmarks", "examples"]:
            try:
                files = self.storage_gateway.list_files(check_dir, pattern="*.json")
            except Exception:
                files = []
            for f_path in sorted(files):
                try:
                    # SEC-13: Skip oversized files (> 2MB) to prevent memory exhaustion DoS
                    if hasattr(os.path, "getsize") and os.path.exists(f_path) and os.path.getsize(f_path) > 2 * 1024 * 1024:
                        continue
                    content = self.storage_gateway.read_text(f_path)
                    if len(content) > 2 * 1024 * 1024:
                        continue
                    scenarios.append(ScenarioParser.from_json(content))
                except Exception:
                    continue
        return scenarios

    def _stream_task_logs(self, task_id: str, query_params: str = "") -> None:
        try:
            status_info = self.bg_runner.get_status(task_id)
            if status_info is None:
                self.send_error(404, f"Task {task_id} not found")
                return

            offset = 0
            last_event_id = self.headers.get("Last-Event-ID")
            if last_event_id and last_event_id.isdigit():
                offset = int(last_event_id)
            elif query_params:
                from urllib.parse import parse_qs
                qs = parse_qs(query_params)
                if "offset" in qs and qs["offset"][0].isdigit():
                    offset = int(qs["offset"][0])

            cors_origin = self._get_cors_origin()
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache, no-transform")
            self.send_header("Connection", "keep-alive")
            if cors_origin:
                self.send_header("Access-Control-Allow-Origin", cors_origin)
                self.send_header("Vary", "Origin")
            self.end_headers()

            last_is_running = True
            for i in range(600):  # Stream up to ~60s
                # REL-03: Throttle process status check to 1/sec (every 10 cycles) to eliminate fork storm
                should_check_status = (i % 10 == 0)
                chunk, new_offset, is_running = self.bg_runner.read_log_chunk(
                    task_id,
                    start_offset=offset,
                    check_status=should_check_status,
                    last_is_running=last_is_running,
                )
                last_is_running = is_running
                if chunk:
                    offset = new_offset
                    msg = json.dumps({"chunk": chunk, "offset": offset, "status": "RUNNING" if is_running else "STOPPED"})
                    self.wfile.write(f"id: {offset}\ndata: {msg}\n\n".encode("utf-8"))
                    self.wfile.flush()
                elif not is_running:
                    msg = json.dumps({"chunk": "", "offset": offset, "status": "COMPLETED"})
                    self.wfile.write(f"id: {offset}\ndata: {msg}\nevent: close\ndata: end\n\n".encode("utf-8"))
                    self.wfile.flush()
                    break
                elif i % 50 == 0:
                    # REL-04: Periodic SSE keepalive heartbeat to detect disconnects and keep proxies open
                    self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
                time.sleep(0.1)
            else:
                try:
                    self.wfile.write(b"event: timeout\ndata: end\n\n")
                    self.wfile.flush()
                except Exception:
                    pass
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            self.close_connection = True
            with BentoApiHandler._sse_lock:
                BentoApiHandler._active_sse_connections = max(0, BentoApiHandler._active_sse_connections - 1)

    def _serve_static_file(self, req_path: str) -> None:
        if not self.static_dir.exists():
            msg = b"<h1>Bento Dashboard UI</h1><p>Web bundle not found. Run 'npm run build' inside web/.</p>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
            return

        clean_path = req_path.lstrip("/")
        if not clean_path:
            target_file = self.static_dir / "index.html"
        else:
            resolved_target = (self.static_dir / clean_path).resolve()
            resolved_static_dir = self.static_dir.resolve()
            if not resolved_target.is_relative_to(resolved_static_dir):
                self.send_error(403, "Forbidden")
                return
            if not resolved_target.exists() or resolved_target.is_dir():
                target_file = self.static_dir / "index.html"
            else:
                target_file = resolved_target

        try:
            content = target_file.read_bytes()
            mime, _ = mimetypes.guess_type(str(target_file))
            mime = mime or "application/octet-stream"

            self.send_response(200)
            self.send_header("Content-Type", f"{mime}; charset=utf-8" if "text" in mime or "javascript" in mime else mime)
            self.send_header("Content-Length", str(len(content)))
            # SEC-04: Enforce clickjacking and MIME-sniffing defenses on static assets
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(content)
        except Exception:
            self.send_error(404, "File Not Found")


def _get_network_ip() -> str:
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


class FastThreadingHTTPServer(ThreadingHTTPServer):
    """ThreadingHTTPServer that bypasses blocking reverse DNS lookups (socket.getfqdn) on bind."""
    # REL-05: Enable daemon threads to avoid hanging on exit due to active SSE streams
    daemon_threads = True

    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.socket.bind(self.server_address)
        self.server_address = self.socket.getsockname()
        self.server_name = str(self.server_address[0])
        self.server_port = self.server_address[1]


class BentoWebServer:
    def __init__(
        self,
        bg_runner: BackgroundTaskRunner,
        memory_gateway: MemoryGateway,
        storage_gateway: StorageGateway,
        run_suite_uc: RunSuiteUseCase,
        dream_uc: DreamCycleUseCase,
        trace_gateway: TraceGateway | None = None,
        execution_gateway: ExecutionGateway | None = None,
        host: str = "127.0.0.1",
        port: int = 8765,
        static_dir: str | Path | None = None,
        workspace_dir: str | Path | None = None,
    ):
        self.host = host
        self.port = port
        self.bg_runner = bg_runner
        self.memory_gateway = memory_gateway
        self.storage_gateway = storage_gateway
        self.run_suite_uc = run_suite_uc
        self.dream_uc = dream_uc
        self.trace_gateway = trace_gateway
        scenario_runner = getattr(run_suite_uc, "_run_scenario_use_case", getattr(run_suite_uc, "_run_scenario", None))
        self.execution_gateway = execution_gateway or getattr(scenario_runner, "_execution_gateway", None)
        self.static_dir = Path(static_dir) if static_dir else Path(os.getcwd()) / "web" / "dist"
        self.workspace_dir = Path(workspace_dir).resolve() if workspace_dir else Path.cwd().resolve()
        self._server: ThreadingHTTPServer | None = None

    def start(self, block: bool = True) -> None:
        handler_cls = BentoApiHandler
        handler_cls.bg_runner = self.bg_runner
        handler_cls.memory_gateway = self.memory_gateway
        handler_cls.trace_gateway = self.trace_gateway
        handler_cls.storage_gateway = self.storage_gateway
        handler_cls.execution_gateway = self.execution_gateway
        handler_cls.run_suite_uc = self.run_suite_uc
        handler_cls.dream_uc = self.dream_uc
        handler_cls.static_dir = self.static_dir
        handler_cls.workspace_dir = str(self.workspace_dir)
        handler_cls.start_time = time.monotonic()

        self._server = FastThreadingHTTPServer((self.host, self.port), handler_cls)
        self.port = self._server.server_address[1]
        local_url = f"http://localhost:{self.port}"
        net_ip = _get_network_ip()
        net_url = f"http://{net_ip}:{self.port}"

        print("🍱 Bento Web Monitor is serving!")
        print(f"   • Local (Mac):    {local_url}")
        if self.host in ("0.0.0.0", ""):
            print(f"   • Network (Phone): {net_url}  📱 (Open this on your phone on the same Wi-Fi)")
        else:
            print(f"   • Phone Access:   Use 'bento ui --network' or '--host 0.0.0.0'")

        if block:
            try:
                self._server.serve_forever()
            except KeyboardInterrupt:
                print("\nStopping Bento Web Monitor...")
                self._server.server_close()
        else:
            import threading
            self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
            self._thread.start()

    def stop(self) -> None:
        if self._server:
            self._server.shutdown()
            self._server.server_close()
