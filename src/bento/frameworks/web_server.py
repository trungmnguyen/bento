"""BentoWebServer: Zero-dependency embedded HTTP server serving REST API and React dashboard."""
from __future__ import annotations
import datetime
import json
import mimetypes
import os
import re
import socket
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.domain.models import Scenario, TraceEvent
from bento.domain.ports import MemoryGateway, StorageGateway, TraceGateway
from bento.domain.rules import detect_recurring_skill_patterns
from bento.frameworks.bg_runner import BackgroundTaskRunner
from bento.use_cases.dream_cycle import DreamCycleUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class BentoApiHandler(BaseHTTPRequestHandler):
    bg_runner: BackgroundTaskRunner
    memory_gateway: MemoryGateway
    trace_gateway: TraceGateway | None
    storage_gateway: StorageGateway
    run_suite_uc: RunSuiteUseCase
    dream_uc: DreamCycleUseCase
    static_dir: Path
    start_time: float

    def address_string(self) -> str:
        # Avoid blocking reverse DNS lookups (socket.getfqdn) on every request
        return str(self.client_address[0])

    def log_message(self, format: str, *args: any) -> None:
        # Suppress standard logging to avoid stderr pollution in tests and ambient monitoring
        pass

    def _send_json(self, data: any, status: int = 200) -> None:
        payload = json.dumps(data, default=lambda o: getattr(o, "__dict__", str(o))).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
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
            if len(parts) != 5 or not re.match(r"^bg-\d+$", parts[3]):
                return self._send_json({"error": "Invalid task ID"}, status=400)
            task_id = parts[3]
            logs = self.bg_runner.get_logs(task_id, lines=200)
            return self._send_json({"task_id": task_id, "logs": logs})

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

        # Fallback: Serve Static Files (React build)
        self._serve_static_file(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
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
            if len(parts) != 5 or not re.match(r"^bg-\d+$", parts[3]):
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
                    self.trace_gateway.append_trace_event(event)

            data = {
                "suite_name": suite_res.suite_name,
                "passed_scenarios": suite_res.passed_scenarios,
                "total_scenarios": suite_res.total_scenarios,
                "pass_rate": suite_res.pass_rate,
                "total_duration_ms": suite_res.total_duration_ms,
                "all_passed": suite_res.all_passed,
                "results": [
                    {
                        "scenario_name": r.scenario_name,
                        "passed": r.passed,
                        "duration_ms": r.total_duration_ms,
                        "step_results": [
                            {
                                "step_name": sr.step_name,
                                "status": sr.status.value,
                                "error_message": sr.error_message,
                            }
                            for sr in r.step_results
                        ],
                    }
                    for r in suite_res.scenario_results
                ],
            }
            return self._send_json(data)

        elif path == "/api/dream":
            dream_res = self.dream_uc.execute(benchmarks_dir="examples", harvest_traces=True)
            data = {
                "consolidated_lessons_count": dream_res.consolidated_lessons_count,
                "new_lessons_discovered": dream_res.new_lessons_discovered,
                "total_duration_ms": dream_res.total_duration_ms,
                "all_passed": dream_res.suite_result.all_passed,
            }
            return self._send_json(data)

        return self._send_json({"error": "Route not found"}, status=404)

    def _load_all_scenarios(self) -> list[Scenario]:
        scenarios: list[Scenario] = []
        for check_dir in ["benchmarks", "examples"]:
            if os.path.exists(check_dir):
                files = self.storage_gateway.list_files(check_dir, pattern="*.json")
                for f_path in sorted(files):
                    try:
                        content = self.storage_gateway.read_text(f_path)
                        scenarios.append(ScenarioParser.from_json(content))
                    except Exception:
                        continue
        return scenarios

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
        target_file = self.static_dir / clean_path

        if not clean_path or not target_file.exists() or target_file.is_dir():
            target_file = self.static_dir / "index.html"

        try:
            content = target_file.read_bytes()
            mime, _ = mimetypes.guess_type(str(target_file))
            mime = mime or "application/octet-stream"

            self.send_response(200)
            self.send_header("Content-Type", f"{mime}; charset=utf-8" if "text" in mime or "javascript" in mime else mime)
            self.send_header("Content-Length", str(len(content)))
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
        host: str = "127.0.0.1",
        port: int = 8765,
        static_dir: str | Path | None = None,
    ):
        self.host = host
        self.port = port
        self.bg_runner = bg_runner
        self.memory_gateway = memory_gateway
        self.storage_gateway = storage_gateway
        self.run_suite_uc = run_suite_uc
        self.dream_uc = dream_uc
        self.trace_gateway = trace_gateway
        self.static_dir = Path(static_dir) if static_dir else Path(os.getcwd()) / "web" / "dist"
        self._server: ThreadingHTTPServer | None = None

    def start(self, block: bool = True) -> None:
        handler_cls = BentoApiHandler
        handler_cls.bg_runner = self.bg_runner
        handler_cls.memory_gateway = self.memory_gateway
        handler_cls.trace_gateway = self.trace_gateway
        handler_cls.storage_gateway = self.storage_gateway
        handler_cls.run_suite_uc = self.run_suite_uc
        handler_cls.dream_uc = self.dream_uc
        handler_cls.static_dir = self.static_dir
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
