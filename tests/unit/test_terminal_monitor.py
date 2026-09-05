"""Unit tests for Bento TerminalMonitor (Live Terminal Dashboard & Hotkeys)."""
import io
import shutil
import sys
import tempfile
import unittest

from bento.domain.models import MemoryBank, MemoryLesson, TraceEvent
from bento.frameworks.bg_runner import BackgroundTaskRunner
from bento.frameworks.terminal_monitor import TerminalMonitor
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

    def exists(self, path: str) -> bool:
        return path in self.files

    def list_files(self, directory: str, pattern: str = "*") -> list[str]:
        return [f for f in self.files.keys() if f.startswith(directory)]


class MockTraceGateway:
    def __init__(self, traces: list[TraceEvent] | None = None):
        self.traces = traces or []

    def record_trace(self, event: TraceEvent, working_dir=None) -> None:
        self.traces.append(event)

    def load_recent_traces(self, limit: int = 50, working_dir=None) -> list[TraceEvent]:
        return self.traces[:limit]


class MockRunSuiteUseCase:
    def execute(self, scenarios, suite_name=""):
        from bento.domain.models import SuiteResult
        return SuiteResult(
            suite_name=suite_name,
            total_scenarios=2,
            passed_scenarios=2,
            failed_scenarios=0,
            total_duration_ms=8.0,
            scenario_results=[],
        )


class MockDreamUseCase:
    def execute(self, benchmarks_dir="examples", harvest_traces=True):
        from bento.domain.models import DreamCycleResult, SuiteResult
        return DreamCycleResult(
            consolidated_lessons_count=3,
            new_lessons_discovered=2,
            suite_result=SuiteResult(
                suite_name="Dream Suite",
                total_scenarios=1,
                passed_scenarios=1,
                failed_scenarios=0,
                total_duration_ms=2.0,
                scenario_results=[],
            ),
            total_duration_ms=12.0,
        )


class TestTerminalMonitor(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.bg_runner = BackgroundTaskRunner(base_dir=self.test_dir)
        self.lesson = MemoryLesson(
            id="MEM-002",
            title="Idempotent Deployments",
            category="infra",
            context="Flaky network causing double deploys",
            rule="Always check if service exists before creating",
            anti_pattern="Unconditional resource creation",
            discovery_date="2026-09-04",
            tags=["infra", "deploy"],
        )
        self.memory_gw = MockMemoryGateway(lessons=[self.lesson])
        self.storage_gw = MockStorageGateway()
        self.trace_gw = MockTraceGateway(traces=[
            TraceEvent(
                timestamp="2026-09-04T12:30:00",
                task_name="Harness Self-Check",
                iteration=1,
                event_type="iteration",
                passed=True,
            )
        ])
        self.run_suite_uc = MockRunSuiteUseCase()
        self.dream_uc = MockDreamUseCase()

        self.monitor = TerminalMonitor(
            bg_runner=self.bg_runner,
            memory_gateway=self.memory_gw,
            storage_gateway=self.storage_gw,
            run_suite_uc=self.run_suite_uc,
            dream_uc=self.dream_uc,
            trace_gateway=self.trace_gw,
            refresh_interval=0.1,
        )

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_render_screen_contains_telemetry_sections(self):
        screen = self.monitor.render_screen()
        # Verify headers and sections
        self.assertIn("BENTO TELEMETRY TERMINAL WATCH", screen)
        self.assertIn("BUTLER DAEMON PROCESSES", screen)
        self.assertIn("PERSISTENT MEMORY BANK", screen)
        self.assertIn("RECENT SENSORY TRACES", screen)
        # Verify hotkeys
        self.assertIn("[r]", screen)
        self.assertIn("[d]", screen)
        self.assertIn("[k]", screen)
        self.assertIn("[q]", screen)
        # Verify lesson content
        self.assertIn("MEM-002", screen)
        self.assertIn("Idempotent Deployments", screen)
        # Verify trace content
        self.assertIn("Harness Self-Check", screen)

    def test_run_loop_in_non_interactive_mode(self):
        # In testing environment, sys.stdin.isatty() is False
        # Capturing stdout to ensure render_screen() was printed
        captured_out = io.StringIO()
        original_stdout = sys.stdout
        try:
            sys.stdout = captured_out
            self.monitor.run_loop(max_cycles=1)
        finally:
            sys.stdout = original_stdout

        output = captured_out.getvalue()
        self.assertIn("BENTO TELEMETRY TERMINAL WATCH", output)

    def test_handle_run_suite(self):
        self.monitor._handle_run_suite()
        self.assertIn("Suite Complete: 2/2 passed", self.monitor._action_message)

    def test_handle_dream(self):
        self.monitor._handle_dream()
        self.assertIn("Dream Complete! Harvested 2 new lessons", self.monitor._action_message)

    def test_handle_kill_all(self):
        self.monitor._handle_kill_all()
        self.assertIn("Terminated 0 active daemon task(s)", self.monitor._action_message)


if __name__ == "__main__":
    unittest.main()
