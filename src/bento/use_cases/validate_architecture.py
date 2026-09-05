"""ValidateArchitectureUseCase: Orchestrates Clean Architecture AST purity validation."""
from __future__ import annotations
from bento.domain.models import ArchitectureReport, ArchitectureViolation
from bento.domain.ports import StorageGateway
from bento.domain.rules import check_domain_ast_purity


class ValidateArchitectureUseCase:
    def __init__(self, storage_gateway: StorageGateway) -> None:
        self._storage = storage_gateway

    def execute(self, target_dir: str = "src/bento/domain") -> ArchitectureReport:
        files = self._storage.list_files(target_dir, "*.py")
        sub_files = self._storage.list_files(target_dir, "**/*.py")
        all_unique_files = sorted(list(set(files + sub_files)))

        all_violations: list[ArchitectureViolation] = []
        for f_path in all_unique_files:
            try:
                code = self._storage.read_text(f_path)
                violations = check_domain_ast_purity(f_path, code)
                all_violations.extend(violations)
            except Exception as e:
                all_violations.append(
                    ArchitectureViolation(
                        file_path=f_path,
                        line_number=1,
                        rule="readable_file",
                        message=f"Failed to read file for AST inspection: {e}",
                    )
                )

        return ArchitectureReport(
            target_dir=target_dir,
            files_checked=len(all_unique_files),
            violations=all_violations,
        )
