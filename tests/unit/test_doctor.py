"""Unit tests for DoctorDiagnosticsUseCase and Bento Doctor CLI."""
import unittest

from bento.adapters.controllers.cli_controller import CliController
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.domain.models import (
    DiagnosticSeverity,
    DoctorReport,
    MemoryBank,
    MemoryLesson,
)
from bento.use_cases.doctor_diagnostics import DoctorDiagnosticsUseCase


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

    def save_memory(self, memory: MemoryBank, working_dir=None) -> None:
        self.memory = memory


class TestDoctorDiagnosticsUseCase(unittest.TestCase):
    def setUp(self):
        self.valid_gitignore = """
GoogleService-Info.plist
xcuserdata/
.env
.env.*
__pycache__/
"""
        self.storage = MockStorageGateway({
            ".gitignore": self.valid_gitignore,
            "src/bento/domain/models.py": "from dataclasses import dataclass\n@dataclass\nclass M:\n    pass\n",
        })
        self.memory = MockMemoryGateway([
            MemoryLesson(id="MEM-1", title="Test Rule", category="general", context="", rule="Be pure")
        ])

    def test_all_healthy(self):
        use_case = DoctorDiagnosticsUseCase(self.storage, self.memory)
        info = {
            "python_version": (3, 12, 1),
            "python_version_str": "3.12.1",
            "node_version": "v22.0.0",
            "port_8765_available": True,
            "daemon_running": False,
        }
        report = use_case.execute(system_info=info)
        self.assertTrue(report.all_passed)
        self.assertEqual(report.total_checks, 6)
        names = [c.name for c in report.checks]
        self.assertIn("Python Runtime", names)
        self.assertIn("Node Toolchain", names)
        self.assertIn("Web Server Port (8765)", names)
        self.assertIn("Clean Architecture AST", names)
        self.assertIn("Git Shield Hygiene", names)
        self.assertIn("Institutional Memory", names)

    def test_python_version_below_minimum(self):
        use_case = DoctorDiagnosticsUseCase(self.storage, self.memory)
        info = {
            "python_version": (3, 11, 4),
            "python_version_str": "3.11.4",
            "node_version": "v22.0.0",
            "port_8765_available": True,
        }
        report = use_case.execute(system_info=info)
        self.assertFalse(report.all_passed)
        py_check = next(c for c in report.checks if c.name == "Python Runtime")
        self.assertEqual(py_check.severity, DiagnosticSeverity.FAIL)
        self.assertIn("below required version 3.12", py_check.message)

    def test_missing_gitignore_fails(self):
        empty_storage = MockStorageGateway({
            "src/bento/domain/models.py": "class M: pass",
        })
        use_case = DoctorDiagnosticsUseCase(empty_storage, self.memory)
        report = use_case.execute()
        git_check = next(c for c in report.checks if c.name == "Git Shield Hygiene")
        self.assertEqual(git_check.severity, DiagnosticSeverity.FAIL)
        self.assertIn("missing from workspace root", git_check.message)

    def test_missing_patterns_in_gitignore(self):
        insecure_storage = MockStorageGateway({
            ".gitignore": "node_modules/\n",
            "src/bento/domain/models.py": "class M: pass",
        })
        use_case = DoctorDiagnosticsUseCase(insecure_storage, self.memory)
        report = use_case.execute()
        git_check = next(c for c in report.checks if c.name == "Git Shield Hygiene")
        self.assertEqual(git_check.severity, DiagnosticSeverity.FAIL)
        self.assertIn("Missing mandatory patterns", git_check.message)

    def test_cli_controller_handle_doctor(self):
        presenter = ConsolePresenter(use_color=False)
        controller = CliController(
            run_scenario_use_case=None,
            run_suite_use_case=None,
            storage_gateway=self.storage,
            presenter=presenter,
            memory_gateway=self.memory,
        )
        code, out = controller.handle_doctor()
        self.assertIn("BENTO SYSTEM & HYGIENE DOCTOR", out)


if __name__ == "__main__":
    unittest.main()
