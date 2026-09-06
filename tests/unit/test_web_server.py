"""Unit tests for BentoWebServer (REST API & Static File Serving)."""
import json
import shutil
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from bento.domain.models import MemoryBank, MemoryLesson, TraceEvent
from bento.frameworks.bg_runner import BackgroundTaskRunner
from bento.frameworks.web_server import BentoWebServer
from bento.use_cases.dream_cycle import DreamCycleUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class MockMemoryGateway:
    def __init__(self, lessons: list[MemoryLesson] | None = None):
        self.memory = MemoryBank(lessons=lessons or [])

    def load_memory(self, working_dir=None) -> MemoryBank:
        return self.memory

    def save_memory(self, memory: MemoryBank, working_dir=None) -> None:
        self.memory = memory


class MockStorageGateway:
    def __init__(self):
        self.files = {}

    def read_text(self, path: str) -> str:
        return self.files.get(path, "")

    def write_text(self, path: str, content: str) -> None:
        self.files[path] = content

    def exists(self, path: str) -> bool:
        return path in self.files

    def file_exists(self, path: str) -> bool:
        return path in self.files

    def list_files(self, directory: str, pattern: str = "*") -> list[str]:
        return [f for f in self.files.keys() if f.startswith(directory)]


class MockTraceGateway:
    def __init__(self, traces: list[TraceEvent] | None = None):
        self.traces = traces or []

    def append_trace_event(self, event: TraceEvent, working_dir=None) -> None:
        self.traces.append(event)

    def record_trace(self, event: TraceEvent, working_dir=None) -> None:
        self.traces.append(event)

    def load_recent_traces(self, limit: int = 50, working_dir=None) -> list[TraceEvent]:
        return self.traces[:limit]


class MockRunSuiteUseCase:
    def __init__(self):
        class MockRunScenario:
            def __init__(self):
                self._execution_gateway = MockExecutionGateway()

            def execute(self, scenario):
                from bento.domain.models import ScenarioResult, StepStatus
                return ScenarioResult(
                    scenario_name=getattr(scenario, "name", "mock_scenario"),
                    status=StepStatus.PASSED,
                    total_duration_ms=1.0,
                    step_results=[],
                )
        self._run_scenario_use_case = MockRunScenario()
        self._run_scenario = self._run_scenario_use_case

    def execute(self, scenarios, suite_name=""):
        from bento.domain.models import SuiteResult
        return SuiteResult(
            suite_name=suite_name,
            total_scenarios=len(scenarios),
            passed_scenarios=len(scenarios),
            failed_scenarios=0,
            total_duration_ms=5.0,
            scenario_results=[],
        )


class MockDreamUseCase:
    def execute(self, benchmarks_dir="examples", harvest_traces=True):
        from bento.domain.models import DreamCycleResult, SuiteResult
        return DreamCycleResult(
            consolidated_lessons_count=3,
            new_lessons_discovered=1,
            suite_result=SuiteResult(
                suite_name="Dream Suite",
                total_scenarios=1,
                passed_scenarios=1,
                failed_scenarios=0,
                total_duration_ms=2.0,
                scenario_results=[],
            ),
            total_duration_ms=10.0,
        )


class MockExecutionGateway:
    def execute_command(self, command: str, cwd=None, env=None, timeout_sec=30.0):
        if "fail" in command:
            return 1, "", "command failed", 10.0
        return 0, f"mock output for {command}", "", 5.0


class TestBentoWebServer(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.bg_runner = BackgroundTaskRunner(base_dir=self.test_dir)
        self.sample_lesson = MemoryLesson(
            id="MEM-001",
            title="Always Test Before Push",
            category="git",
            context="Pushing untested code breaks CI",
            rule="Run full test suite locally before pushing",
            anti_pattern="git push -f without tests",
            discovery_date="2026-09-04",
            tags=["git", "ci"],
        )
        self.memory_gw = MockMemoryGateway(lessons=[self.sample_lesson])
        self.storage_gw = MockStorageGateway()
        self.trace_gw = MockTraceGateway(traces=[
            TraceEvent(
                timestamp="2026-09-04T12:00:00",
                task_name="Verify Server",
                iteration=1,
                event_type="test",
                passed=True,
            )
        ])
        self.run_suite_uc = MockRunSuiteUseCase()
        self.dream_uc = MockDreamUseCase()
        self.exec_gw = MockExecutionGateway()

        # Create dummy static directory
        self.static_dir = Path(self.test_dir) / "dist"
        self.static_dir.mkdir(parents=True, exist_ok=True)
        (self.static_dir / "index.html").write_text("<html><body>Bento UI Test</body></html>", encoding="utf-8")

        self.server = BentoWebServer(
            bg_runner=self.bg_runner,
            memory_gateway=self.memory_gw,
            storage_gateway=self.storage_gw,
            run_suite_uc=self.run_suite_uc,
            dream_uc=self.dream_uc,
            trace_gateway=self.trace_gw,
            execution_gateway=self.exec_gw,
            host="127.0.0.1",
            port=0,
            static_dir=self.static_dir,
        )
        self.server.start(block=False)
        self.base_url = f"http://127.0.0.1:{self.server.port}"

    def tearDown(self):
        for task in self.bg_runner.list_tasks(working_dir=self.test_dir):
            try:
                self.bg_runner.kill_task(task.get("id", ""), working_dir=self.test_dir)
            except Exception:
                pass
        self.server.stop()
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def _get(self, endpoint: str):
        req = urllib.request.Request(f"{self.base_url}{endpoint}")
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8")

    def _post(self, endpoint: str, payload: dict):
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}{endpoint}",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req) as resp:
                return resp.status, resp.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8")

    def _raw_request(self, method: str, path: str, payload: dict | None = None) -> tuple[int, str]:
        import http.client
        conn = http.client.HTTPConnection("127.0.0.1", self.server.port, timeout=5.0)
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = {"Content-Type": "application/json"} if body else {}
        conn.request(method, path, body=body, headers=headers)
        resp = conn.getresponse()
        data = resp.read().decode("utf-8")
        conn.close()
        return resp.status, data

    def test_api_status(self):
        status, body = self._get("/api/status")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertEqual(data["status"], "ACTIVE")
        self.assertEqual(data["total_lessons_count"], 1)
        self.assertEqual(data["recent_traces_count"], 1)

    def test_api_bg_list(self):
        status, body = self._get("/api/bg")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertIsInstance(data, list)

    def test_api_memory(self):
        status, body = self._get("/api/memory")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["id"], "MEM-001")
        self.assertEqual(data[0]["title"], "Always Test Before Push")

    def test_api_traces(self):
        status, body = self._get("/api/traces")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertIn("traces", data)
        self.assertIn("skills", data)
        self.assertEqual(len(data["traces"]), 1)
        self.assertEqual(data["traces"][0]["task_name"], "Verify Server")

    def test_api_benchmarks(self):
        status, body = self._get("/api/benchmarks")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertIsInstance(data, list)

    def test_api_bg_run_validation_fails_on_empty(self):
        status, body = self._post("/api/bg/run", {})
        self.assertEqual(status, 400)
        data = json.loads(body)
        self.assertIn("error", data)

    def test_api_bg_run_success(self):
        status, body = self._post("/api/bg/run", {"command": "echo 'bento test'", "tag": "unit-test"})
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data.get("started"))
        self.assertTrue(data.get("task_id", "").startswith("bg-"))
        self.assertGreater(data.get("pid", 0), 0)

    def test_api_bg_logs_path_traversal_rejected(self):
        status, body = self._raw_request("GET", "/api/bg/../../logs")
        self.assertEqual(status, 400)
        data = json.loads(body)
        self.assertIn("error", data)

        # Non-bg format
        status, body = self._raw_request("GET", "/api/bg/malicious_payload/logs")
        self.assertEqual(status, 400)

    def test_api_bg_kill_path_traversal_rejected(self):
        status, body = self._raw_request("POST", "/api/bg/../../kill", {})
        self.assertEqual(status, 400)
        data = json.loads(body)
        self.assertIn("error", data)

        # Non-bg format
        status, body = self._raw_request("POST", "/api/bg/malicious_payload/kill", {})
        self.assertEqual(status, 400)

    def test_api_bg_logs_valid(self):
        # First spawn a task
        _, run_body = self._post("/api/bg/run", {"command": "echo 'log output test'", "tag": "log-test"})
        task_id = json.loads(run_body)["task_id"]

        # Fetch logs
        status, body = self._get(f"/api/bg/{task_id}/logs")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertEqual(data["task_id"], task_id)
        self.assertIn("logs", data)

    def test_api_dream_endpoint(self):
        status, body = self._post("/api/dream", {})
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertEqual(data["new_lessons_discovered"], 1)
        self.assertTrue(data["all_passed"])

    def test_serve_static_index(self):
        status, body = self._get("/")
        self.assertEqual(status, 200)
        self.assertIn("Bento UI Test", body)

    def test_api_bg_prune(self):
        # Spawn a short-lived task
        _, run_body = self._post("/api/bg/run", {"command": "echo 'quick'", "tag": "test-prune"})
        time.sleep(0.3)

        status, body = self._post("/api/bg/prune", {})
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertIn("pruned_tasks_count", data)

    def test_api_memory_add(self):
        payload = {
            "title": "Clean Domain Ports",
            "rule": "Domain entities must not depend on database or network models",
            "category": "architecture",
            "anti_pattern": "Passing ORM objects into pure calculations",
            "tags": ["architecture", "clean-code"],
        }
        status, body = self._post("/api/memory/add", payload)
        self.assertEqual(status, 201)
        data = json.loads(body)
        self.assertTrue(data.get("success"))
        self.assertEqual(data["lesson"]["title"], "Clean Domain Ports")
        self.assertTrue(data["lesson"]["id"].startswith("MEM-"))

        # Test validation failure
        bad_status, bad_body = self._post("/api/memory/add", {"title": ""})
        self.assertEqual(bad_status, 400)

    def test_path_traversal_blocked(self):
        # Attempt to read outside static_dir
        status, body = self._get("/../../../../etc/passwd")
        self.assertIn(status, [403, 404])
        self.assertNotIn("root:", body)

    def test_cross_origin_post_blocked(self):
        # Cross-origin request from malicious site must be rejected with 403
        data = json.dumps({"command": "echo hacked"}).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}/api/bg/run",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Origin": "https://malicious-site.com",
            },
        )
        try:
            with urllib.request.urlopen(req) as resp:
                status = resp.status
        except urllib.error.HTTPError as e:
            status = e.code

        self.assertEqual(status, 403)

    def test_api_bg_stream_endpoint(self):
        # Start a background task
        _, run_body = self._post("/api/bg/run", {"command": "echo 'stream test'", "tag": "test-stream"})
        task_id = json.loads(run_body)["task_id"]

        # Request SSE stream
        req = urllib.request.Request(f"{self.base_url}/api/bg/{task_id}/stream")
        with urllib.request.urlopen(req) as resp:
            self.assertEqual(resp.status, 200)
            content_type = resp.headers.get("Content-Type", "")
            self.assertIn("text/event-stream", content_type)
            chunk = resp.read(100).decode("utf-8", errors="replace")
            self.assertIn("data:", chunk)

    def test_api_bg_stream_not_found(self):
        # SEC-06: Non-existent task returns 404
        status, _ = self._get("/api/bg/bg-999999/stream")
        self.assertEqual(status, 404)

    def test_api_memory_graph_endpoint(self):
        # Green Team Flavor Graph
        status, body = self._get("/api/memory/graph")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertIn("nodes", data)
        self.assertIn("edges", data)
        self.assertIn("categories", data)
        self.assertGreater(len(data["nodes"]), 0)

    def test_api_benchmarks_create(self):
        # Tasting Studio Create Scenario
        payload = {
            "name": "unit_test_flight",
            "description": "Crafted in Tasting Studio",
            "tags": ["unit", "studio"],
            "steps": [
                {
                    "name": "check_echo",
                    "command": "echo hello",
                    "timeout_sec": 10.0,
                    "assertions": [
                        {
                            "type": "CONTAINS",
                            "target_field": "stdout",
                            "expected": "hello",
                        }
                    ],
                }
            ],
        }
        status, body = self._post("/api/benchmarks/create", payload)
        self.assertEqual(status, 201)
        data = json.loads(body)
        self.assertTrue(data.get("success"))
        self.assertEqual(data["scenario"]["name"], "unit_test_flight")

    def test_api_benchmarks_preflight(self):
        # Tasting Studio Preflight Execution
        payload = {
            "command": "echo test_preflight",
            "assertions": [
                {
                    "type": "CONTAINS",
                    "target_field": "stdout",
                    "expected": "test_preflight",
                }
            ],
        }
        status, body = self._post("/api/benchmarks/preflight", payload)
        self.assertEqual(status, 200)
    def test_api_benchmarks_create_overwrite_conflict(self):
        # SEC-10: Attempting to create duplicate benchmark without overwrite=true returns 409
        payload = {
            "name": "conflict_test_flight",
            "description": "Conflict check",
            "steps": [{"name": "s1", "command": "echo 1"}],
        }
        # First creation succeeds
        status1, _ = self._post("/api/benchmarks/create", payload)
        self.assertEqual(status1, 201)

        # Second creation without overwrite returns 409 Conflict
        status2, body2 = self._post("/api/benchmarks/create", payload)
        self.assertEqual(status2, 409)
        self.assertIn("already exists", json.loads(body2)["error"])

        # Second creation with overwrite=true succeeds
        payload["overwrite"] = True
        status3, _ = self._post("/api/benchmarks/create", payload)
        self.assertEqual(status3, 201)

    def test_api_telemetry_endpoint(self):
        # Sensory Spark Telemetry Endpoint
        status, body = self._get("/api/telemetry")
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertIn("metrics", data)
        self.assertIn("sparkline", data)
        metrics = data["metrics"]
        self.assertIn("pass_rate", metrics)
        self.assertIn("p50_latency_ms", metrics)
        self.assertIn("p90_latency_ms", metrics)
        self.assertIn("p99_latency_ms", metrics)

    def test_api_benchmarks_run_one(self):
        # BUG-06: Verifies run-one correctly uses scenario runner without AttributeError
        # Set up a mock scenario in storage
        scen_payload = {
            "name": "run_one_test_scenario",
            "description": "Test run-one",
            "steps": [{"name": "s1", "command": "echo 1"}],
        }
        self.storage_gw.files["benchmarks/run_one_test_scenario.json"] = json.dumps(scen_payload)
        status, body = self._post("/api/benchmarks/run-one", {"name": "run_one_test_scenario"})
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertEqual(data["scenario_name"], "run_one_test_scenario")
        self.assertTrue(data["passed"])

    def test_sec_10_payload_too_large(self):
        # SEC-10: Request body exceeding 10MB returns 413 Payload Too Large
        import http.client
        conn = http.client.HTTPConnection("127.0.0.1", self.server.port, timeout=5.0)
        conn.request("POST", "/api/benchmarks/create", headers={"Content-Length": "15000000"})
        resp = conn.getresponse()
        self.assertEqual(resp.status, 413)
        conn.close()

    def test_sec_11_sse_connection_cap(self):
        # SEC-11: Exceeding MAX_SSE_CONNECTIONS returns 429 Too Many Requests
        from bento.frameworks.web_server import BentoApiHandler
        orig_count = BentoApiHandler._active_sse_connections
        try:
            BentoApiHandler._active_sse_connections = BentoApiHandler.MAX_SSE_CONNECTIONS
            status, body = self._get("/api/bg/bg-test-123/stream")
            self.assertEqual(status, 429)
            self.assertIn("Too many concurrent SSE connections", body)
        finally:
            BentoApiHandler._active_sse_connections = orig_count

    def test_sec_12_preflight_cwd_boundary(self):
        # SEC-12: Reject cwd outside workspace root
        status, body = self._post("/api/benchmarks/preflight", {
            "command": "echo test",
            "cwd": "/tmp/outside_workspace"
        })
        self.assertEqual(status, 400)
        self.assertIn("workspace boundary", body)


if __name__ == "__main__":
    unittest.main()

