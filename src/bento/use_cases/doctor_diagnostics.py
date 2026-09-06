"""DoctorDiagnosticsUseCase: Evaluates system health, toolchains, git hygiene, and domain purity."""
from __future__ import annotations

from typing import Any
from bento.domain.models import (
    DiagnosticSeverity,
    DoctorCheckResult,
    DoctorReport,
)
from bento.domain.ports import MemoryGateway, StorageGateway
from bento.domain.rules import check_domain_ast_purity


class DoctorDiagnosticsUseCase:
    def __init__(
        self,
        storage_gateway: StorageGateway,
        memory_gateway: MemoryGateway | None = None,
    ):
        self._storage = storage_gateway
        self._memory = memory_gateway

    def execute(
        self,
        system_info: dict[str, Any] | None = None,
        working_dir: str | None = None,
    ) -> DoctorReport:
        checks: list[DoctorCheckResult] = []
        info = system_info or {}

        # 1. Python Runtime Check
        py_ver = info.get("python_version", (3, 12, 0))
        py_str = info.get("python_version_str", "3.12+")
        if py_ver >= (3, 12):
            checks.append(DoctorCheckResult(
                name="Python Runtime",
                passed=True,
                message=f"Python {py_str} meets requirement (>= 3.12).",
                severity=DiagnosticSeverity.OK,
            ))
        else:
            checks.append(DoctorCheckResult(
                name="Python Runtime",
                passed=False,
                message=f"Python {py_str} is below required version 3.12.",
                severity=DiagnosticSeverity.FAIL,
                remediation="Upgrade Python to 3.12 or newer: brew install python@3.12",
            ))

        # 2. Node & Web Toolchain Check
        node_ver = info.get("node_version")
        if node_ver:
            checks.append(DoctorCheckResult(
                name="Node Toolchain",
                passed=True,
                message=f"Node.js {node_ver} detected for web dashboard.",
                severity=DiagnosticSeverity.OK,
            ))
        else:
            checks.append(DoctorCheckResult(
                name="Node Toolchain",
                passed=False,
                message="Node.js not detected in PATH.",
                severity=DiagnosticSeverity.WARN,
                remediation="Install Node.js (v18+) to build the React dashboard: brew install node",
            ))

        # 3. Port 8765 (Bento Web Server) Check
        port_open = info.get("port_8765_available", True)
        daemon_running = info.get("daemon_running", False)
        if port_open:
            checks.append(DoctorCheckResult(
                name="Web Server Port (8765)",
                passed=True,
                message="Port 8765 is available for Bento Web Monitor.",
                severity=DiagnosticSeverity.OK,
            ))
        elif daemon_running:
            checks.append(DoctorCheckResult(
                name="Web Server Port (8765)",
                passed=True,
                message="Port 8765 is actively serving Bento Web Monitor daemon.",
                severity=DiagnosticSeverity.OK,
            ))
        else:
            checks.append(DoctorCheckResult(
                name="Web Server Port (8765)",
                passed=False,
                message="Port 8765 is occupied by an external process.",
                severity=DiagnosticSeverity.WARN,
                remediation="Identify process on port 8765: lsof -i :8765, or pass --port <new_port>",
            ))

        # 4. Clean Architecture AST Domain Purity Check
        domain_files = self._storage.list_files("src/bento/domain", pattern="*.py")
        violations = []
        for df in domain_files:
            try:
                code = self._storage.read_text(df)
                v = check_domain_ast_purity(df, code)
                violations.extend(v)
            except Exception as e:
                violations.append(f"Failed to inspect {df}: {e}")

        if not violations:
            checks.append(DoctorCheckResult(
                name="Clean Architecture AST",
                passed=True,
                message=f"100% pure domain verified across {len(domain_files)} domain files.",
                severity=DiagnosticSeverity.OK,
            ))
        else:
            checks.append(DoctorCheckResult(
                name="Clean Architecture AST",
                passed=False,
                message=f"{len(violations)} Clean Architecture violations in domain layer!",
                severity=DiagnosticSeverity.FAIL,
                remediation="Audit and remove external I/O imports from src/bento/domain/: run 'bento check'",
            ))

        # 5. Git Shield & Leak Prevention (.gitignore check)
        gitignore_path = ".gitignore"
        if self._storage.file_exists(gitignore_path):
            gi_content = self._storage.read_text(gitignore_path)
            mandatory_patterns = ["GoogleService-Info.plist", "xcuserdata/", ".env"]
            missing_patterns = [p for p in mandatory_patterns if p not in gi_content]

            if not missing_patterns:
                checks.append(DoctorCheckResult(
                    name="Git Shield Hygiene",
                    passed=True,
                    message=".gitignore contains all mandatory leak prevention shields.",
                    severity=DiagnosticSeverity.OK,
                ))
            else:
                checks.append(DoctorCheckResult(
                    name="Git Shield Hygiene",
                    passed=False,
                    message=f"Missing mandatory patterns in .gitignore: {', '.join(missing_patterns)}",
                    severity=DiagnosticSeverity.FAIL,
                    remediation="Add missing security patterns to .gitignore to prevent secret leaks.",
                ))
        else:
            checks.append(DoctorCheckResult(
                name="Git Shield Hygiene",
                passed=False,
                message=".gitignore is missing from workspace root.",
                severity=DiagnosticSeverity.FAIL,
                remediation="Create a .gitignore file containing GoogleService-Info.plist, xcuserdata/, and .env*",
            ))

        # 6. Institutional Memory Bank Health
        if self._memory:
            try:
                bank = self._memory.load_memory(working_dir=working_dir)
                checks.append(DoctorCheckResult(
                    name="Institutional Memory",
                    passed=True,
                    message=f"Memory bank loaded healthy with {len(bank.lessons)} distilled rules.",
                    severity=DiagnosticSeverity.OK,
                ))
            except Exception as e:
                checks.append(DoctorCheckResult(
                    name="Institutional Memory",
                    passed=False,
                    message=f"Failed to parse memory bank: {e}",
                    severity=DiagnosticSeverity.WARN,
                    remediation="Inspect and repair .bento/memory/ lessons bank integrity.",
                ))

        all_passed = all(c.severity != DiagnosticSeverity.FAIL for c in checks)
        summary = "All critical system diagnostics passed." if all_passed else "One or more critical diagnostics failed."

        return DoctorReport(
            checks=checks,
            total_checks=len(checks),
            all_passed=all_passed,
            summary=summary,
        )
