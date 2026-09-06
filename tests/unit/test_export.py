"""Unit tests for ExportReportUseCase and Bento Export CLI."""
import unittest

from bento.adapters.controllers.cli_controller import CliController
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.domain.models import MemoryBank, MemoryLesson, TraceEvent
from bento.use_cases.export_report import ExportReportUseCase


class MockStorageGateway:
    def __init__(self, files: dict[str, str] | None = None):
        self.files = files or {}

    def read_text(self, path: str) -> str:
        return self.files.get(path, "")

    def write_text(self, path: str, content: str) -> None:
        self.files[path] = content

    def file_exists(self, path: str) -> bool:
        return path in self.files

    def list_files(self, directory: str, pattern: str = "*") -> list[str]:
        if directory == "src/bento/domain":
            return [k for k in self.files.keys() if k.startswith("src/bento/domain")]
        return [k for k in self.files.keys() if k.startswith(directory)]


class MockMemoryGateway:
    def __init__(self, lessons: list[MemoryLesson] | None = None):
        self.memory = MemoryBank(lessons=lessons or [])

    def load_memory(self, working_dir=None) -> MemoryBank:
        return self.memory


class MockTraceGateway:
    def __init__(self, traces: list[TraceEvent] | None = None):
        self.traces = traces or []

    def load_recent_traces(self, limit: int = 50, working_dir=None) -> list[TraceEvent]:
        return self.traces[:limit]


class TestExportReportUseCase(unittest.TestCase):
    def setUp(self):
        self.storage = MockStorageGateway({
            ".gitignore": "GoogleService-Info.plist\nxcuserdata/\n.env\n",
            "src/bento/domain/models.py": "class M: pass\n",
            "examples/test.json": "{}",
        })
        self.memory = MockMemoryGateway([
            MemoryLesson(id="MEM-1", title="Axiom 1", category="quant", context="", rule="Rule 1")
        ])
        self.trace = MockTraceGateway([
            TraceEvent(
                timestamp="2026-09-05T12:00:00",
                task_name="Verify",
                iteration=1,
                event_type="test",
                passed=True,
            )
        ])

    def test_export_report_generation(self):
        use_case = ExportReportUseCase(self.storage, self.memory, self.trace)
        report = use_case.execute(output_file="report.md")
        self.assertIn("Bento Engineering & Verification Report", report)
        self.assertIn("Python Runtime", report)
        self.assertIn("Institutional Memory Bank", report)
        self.assertIn("Axiom 1", report)
        self.assertIn("examples/test.json", report)
        self.assertIn("report.md", self.storage.files)
        self.assertEqual(self.storage.files["report.md"], report)

    def test_cli_controller_handle_export(self):
        presenter = ConsolePresenter(use_color=False)
        controller = CliController(
            run_scenario_use_case=None,
            run_suite_use_case=None,
            storage_gateway=self.storage,
            presenter=presenter,
            memory_gateway=self.memory,
            trace_gateway=self.trace,
        )
        code, out = controller.handle_export(output_file="out.md")
        self.assertEqual(code, 0)
        self.assertIn("Report exported successfully to out.md", out)


if __name__ == "__main__":
    unittest.main()
