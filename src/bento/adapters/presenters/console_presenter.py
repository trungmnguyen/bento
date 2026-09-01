"""ConsolePresenter: Formats Domain results into terminal text, Markdown, or JSON.

Zero side-effects: Returns pure strings and does not call print().
"""
from __future__ import annotations
import json
from bento.domain.models import ScenarioResult, StepStatus, SuiteResult
from bento.domain.ports import PresenterGateway


class ConsolePresenter(PresenterGateway):
    def __init__(self, use_color: bool = True):
        self.use_color = use_color

    def _c(self, code: str, text: str) -> str:
        if not self.use_color:
            return text
        return f"\033[{code}m{text}\033[0m"

    def format_scenario_result(self, result: ScenarioResult, verbose: bool = False) -> str:
        lines: list[str] = []
        status_badge = (
            self._c("32;1", "[PASS]") if result.passed else self._c("31;1", "[FAIL]")
        )
        lines.append("")
        lines.append(f"🍱 Bento Harness Run: {self._c("1", result.scenario_name)} {status_badge}")
        lines.append(f"⏱️  Total Duration: {result.total_duration_ms:.1f}ms")
        lines.append("─" * 60)

        for idx, step in enumerate(result.step_results, 1):
            step_badge = (
                self._c("32", "✓ PASSED")
                if step.status == StepStatus.PASSED
                else self._c("31", "✗ FAILED")
            )
            lines.append(f"  Step {idx}: {step.step_name} -> {step_badge} ({step.duration_ms:.1f}ms)")
            lines.append(f"    Command: {self._c("90", step.command)}")

            if step.assertion_results:
                for a_res in step.assertion_results:
                    a_icon = self._c("32", "  ├─ ✓") if a_res.passed else self._c("31", "  ├─ ✗")
                    desc = a_res.assertion.description or a_res.assertion.type.value
                    lines.append(f"    {a_icon} {desc}: {a_res.message}")

            if (not step.status == StepStatus.PASSED or verbose) and (step.stdout or step.stderr):
                if step.stdout:
                    lines.append(f"    {self._c("36", "stdout:")} {step.stdout.strip()}")
                if step.stderr:
                    lines.append(f"    {self._c("33", "stderr:")} {step.stderr.strip()}")

        lines.append("─" * 60)
        return "\n".join(lines)

    def format_suite_result(self, result: SuiteResult) -> str:
        lines: list[str] = []
        overall_badge = (
            self._c("32;1", "ALL PASSED") if result.all_passed else self._c("31;1", "FAILURES DETECTED")
        )
        lines.append("")
        lines.append(f"🍱 Bento Suite: {self._c("1", result.suite_name)} [{overall_badge}]")
        lines.append(f"📊 Pass Rate: {result.pass_rate:.1f}% ({result.passed_scenarios}/{result.total_scenarios} passed)")
        lines.append(f"⏱️  Suite Duration: {result.total_duration_ms:.1f}ms")
        lines.append("=" * 60)

        for s_res in result.scenario_results:
            icon = self._c("32", "[✓ PASS]") if s_res.passed else self._c("31", "[✗ FAIL]")
            lines.append(f"  {icon} {s_res.scenario_name:<35} ({s_res.total_duration_ms:.1f}ms)")

        lines.append("=" * 60)
        return "\n".join(lines)

    def format_json(self, result: ScenarioResult | SuiteResult) -> str:
        def serialize(obj):
            if hasattr(obj, "__dict__"):
                return {k: serialize(v) for k, v in obj.__dict__.items()}
            if isinstance(obj, list):
                return [serialize(i) for i in obj]
            if hasattr(obj, "value"):
                return obj.value
            return obj

        return json.dumps(serialize(result), indent=2)
