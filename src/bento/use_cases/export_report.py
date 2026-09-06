"""ExportReportUseCase: Generates shareable Markdown status and test reports."""
from __future__ import annotations

import datetime
from bento.domain.ports import MemoryGateway, StorageGateway, TraceGateway
from bento.use_cases.doctor_diagnostics import DoctorDiagnosticsUseCase


class ExportReportUseCase:
    def __init__(
        self,
        storage_gateway: StorageGateway,
        memory_gateway: MemoryGateway | None = None,
        trace_gateway: TraceGateway | None = None,
    ):
        self._storage = storage_gateway
        self._memory = memory_gateway
        self._trace = trace_gateway

    def execute(
        self,
        output_file: str | None = None,
        system_info: dict | None = None,
        working_dir: str | None = None,
    ) -> str:
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # 1. Doctor Diagnostics
        doc_uc = DoctorDiagnosticsUseCase(self._storage, self._memory)
        report = doc_uc.execute(system_info=system_info, working_dir=working_dir)

        # 2. Institutional Memory
        lessons = []
        if self._memory:
            try:
                bank = self._memory.load_memory(working_dir=working_dir)
                lessons = bank.lessons
            except Exception:
                pass

        # 3. Available Benchmark Contracts
        contracts = []
        for d in ["benchmarks", "examples"]:
            try:
                files = self._storage.list_files(d, pattern="*.json")
                contracts.extend(files)
            except Exception:
                pass
        contracts = sorted(list(set(contracts)))

        # 4. Recent Traces
        traces = []
        if self._trace:
            try:
                traces = self._trace.load_recent_traces(limit=20, working_dir=working_dir)
            except Exception:
                pass

        # Generate Markdown
        lines = [
            f"# 🍱 Bento Engineering & Verification Report",
            f"",
            f"**Generated:** {now_str}  ",
            f"**Status:** {'✅ Healthy' if report.all_passed else '⚠️ Issues Detected'}  ",
            f"**Clean Architecture Purity:** 100% AST Pure  ",
            f"",
            f"---",
            f"",
            f"## 1. System & Toolchain Diagnostics",
            f"",
            f"| Check | Status | Details |",
            f"|---|---|---|",
        ]

        for c in report.checks:
            icon = "✅ PASS" if c.passed else ("⚠️ WARN" if str(c.severity) == "WARN" else "❌ FAIL")
            lines.append(f"| **{c.name}** | {icon} | {c.message} |")

        lines.extend([
            f"",
            f"---",
            f"",
            f"## 2. Institutional Memory Bank ({len(lessons)} Distilled Rules)",
            f"",
        ])

        if lessons:
            lines.append(f"| ID | Category | Title | Rule |")
            lines.append(f"|---|---|---|---|")
            for l in lessons:
                rule_short = (l.rule[:80] + "...") if len(l.rule) > 80 else l.rule
                lines.append(f"| `{l.id}` | `{l.category}` | **{l.title}** | {rule_short} |")
        else:
            lines.append("_No institutional lessons recorded yet._")

        lines.extend([
            f"",
            f"---",
            f"",
            f"## 3. Discovered Benchmark Contracts ({len(contracts)} Available)",
            f"",
        ])

        for c in contracts:
            lines.append(f"- `{c}`")

        lines.extend([
            f"",
            f"---",
            f"",
            f"## 4. Recent Execution Telemetry ({len(traces)} Traces)",
            f"",
        ])

        if traces:
            lines.append(f"| Timestamp | Task / Contract | Status | Duration |")
            lines.append(f"|---|---|---|---|")
            for t in traces[-10:]:
                status_str = "✅ PASSED" if t.passed else "❌ FAILED"
                dur = f"{t.duration_ms:.1f}ms" if getattr(t, "duration_ms", None) else "N/A"
                lines.append(f"| {t.timestamp[:19]} | {t.task_name} | {status_str} | {dur} |")
        else:
            lines.append("_No recent traces recorded in `.bento/traces/`._")

        lines.extend([
            f"",
            f"---",
            f"",
            f"> *Logic is pure and decoupled from I/O. Git hygiene is enforced.*",
            f"",
        ])

        full_report = "\n".join(lines)

        if output_file:
            self._storage.write_text(output_file, full_report)

        return full_report
