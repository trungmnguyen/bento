"""Unit tests for ValidateArchitectureUseCase and Clean Architecture AST purity checking."""
import unittest
from bento.domain.models import ArchitectureReport, ArchitectureViolation
from bento.domain.ports import StorageGateway
from bento.domain.rules import check_domain_ast_purity
from bento.use_cases.validate_architecture import ValidateArchitectureUseCase


class MemoryStorageGateway(StorageGateway):
    def __init__(self, files: dict[str, str] | None = None) -> None:
        self._files = files or {}

    def read_text(self, path: str) -> str:
        return self._files[path]

    def write_text(self, path: str, content: str) -> None:
        self._files[path] = content

    def list_files(self, directory: str, pattern: str = "*") -> list[str]:
        return [p for p in self._files.keys() if p.startswith(directory)]

    def file_exists(self, path: str) -> bool:
        return path in self._files


class TestValidateArchitecture(unittest.TestCase):
    def test_pure_domain_code_has_no_violations(self):
        pure_code = """
from dataclasses import dataclass

@dataclass(frozen=True)
class PureEntity:
    name: str
    value: int

def pure_calculation(x: int, y: int) -> int:
    return x * 2 + y
"""
        violations = check_domain_ast_purity("src/domain/pure.py", pure_code)
        self.assertEqual(len(violations), 0)

    def test_forbidden_io_import_detected(self):
        impure_code = """
import os
import subprocess

def bad():
    pass
"""
        violations = check_domain_ast_purity("src/domain/bad.py", impure_code)
        self.assertEqual(len(violations), 2)
        rules = [v.rule for v in violations]
        self.assertIn("pure_domain_no_io_imports", rules)
        messages = " ".join(v.message for v in violations)
        self.assertIn("os", messages)
        self.assertIn("subprocess", messages)

    def test_from_import_forbidden_module_detected(self):
        impure_code = """
from pathlib import Path
from sys import argv
"""
        violations = check_domain_ast_purity("src/domain/bad2.py", impure_code)
        self.assertEqual(len(violations), 2)
        messages = " ".join(v.message for v in violations)
        self.assertIn("pathlib", messages)
        self.assertIn("sys", messages)

    def test_side_effect_call_detected(self):
        impure_code = """
def bad_side_effect():
    print("Violating Clean Architecture Rule 2")
"""
        violations = check_domain_ast_purity("src/domain/bad3.py", impure_code)
        self.assertEqual(len(violations), 1)
        self.assertEqual(violations[0].rule, "pure_domain_no_side_effects")
        self.assertIn("print", violations[0].message)

    def test_use_case_execution(self):
        storage = MemoryStorageGateway({
            "src/bento/domain/models.py": "class Model: pass",
            "src/bento/domain/rules.py": "def rule(): return 42",
            "src/bento/domain/impure.py": "import os\nprint('bad')",
        })
        use_case = ValidateArchitectureUseCase(storage)
        report = use_case.execute(target_dir="src/bento/domain")

        self.assertFalse(report.passed)
        self.assertEqual(report.files_checked, 3)
        self.assertEqual(len(report.violations), 2)


if __name__ == "__main__":
    unittest.main()
