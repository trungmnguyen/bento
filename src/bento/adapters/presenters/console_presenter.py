"""ConsolePresenter: Formats Domain results into terminal text, Markdown, or JSON.

Zero side-effects: Returns pure strings and does not call print().
"""
from __future__ import annotations
import json
from bento.domain.models import (
    ArenaResult,
    AutoLoopResult,
    AutoLoopStatus,
    DreamCycleResult,
    MemoryBank,
    OptimizerResult,
    ScenarioResult,
    StepStatus,
    SuiteResult,
    SwarmPipelineResult,
)
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
        lines.append(f"🍱 Bento Harness Run: {self._c('1', result.scenario_name)} {status_badge}")
        lines.append(f"⏱️  Total Duration: {result.total_duration_ms:.1f}ms")
        lines.append("─" * 60)

        for idx, step in enumerate(result.step_results, 1):
            step_badge = (
                self._c("32", "✓ PASSED")
                if step.status == StepStatus.PASSED
                else self._c("31", "✗ FAILED")
            )
            lines.append(f"  Step {idx}: {step.step_name} -> {step_badge} ({step.duration_ms:.1f}ms)")
            lines.append(f"    Command: {self._c('90', step.command)}")

            if step.assertion_results:
                for a_res in step.assertion_results:
                    a_icon = self._c("32", "  ├─ ✓") if a_res.passed else self._c("31", "  ├─ ✗")
                    desc = a_res.assertion.description or a_res.assertion.type.value
                    lines.append(f"    {a_icon} {desc}: {a_res.message}")

            if (not step.status == StepStatus.PASSED or verbose) and (step.stdout or step.stderr):
                if step.stdout:
                    lines.append(f"    {self._c('36', 'stdout:')} {step.stdout.strip()}")
                if step.stderr:
                    lines.append(f"    {self._c('33', 'stderr:')} {step.stderr.strip()}")

        lines.append("─" * 60)
        return "\n".join(lines)

    def format_suite_result(self, result: SuiteResult) -> str:
        lines: list[str] = []
        overall_badge = (
            self._c("32;1", "ALL PASSED") if result.all_passed else self._c("31;1", "FAILURES DETECTED")
        )
        lines.append("")
        lines.append(f"🍱 Bento Suite: {self._c('1', result.suite_name)} [{overall_badge}]")
        lines.append(f"📊 Pass Rate: {result.pass_rate:.1f}% ({result.passed_scenarios}/{result.total_scenarios} passed)")
        lines.append(f"⏱️  Suite Duration: {result.total_duration_ms:.1f}ms")
        lines.append("=" * 60)

        for s_res in result.scenario_results:
            icon = self._c("32", "[✓ PASS]") if s_res.passed else self._c("31", "[✗ FAIL]")
            lines.append(f"  {icon} {s_res.scenario_name:<40} ({s_res.total_duration_ms:.1f}ms)")

        lines.append("=" * 60)
        return "\n".join(lines)

    def format_auto_loop_result(self, result: AutoLoopResult, verbose: bool = False) -> str:
        lines: list[str] = []
        if result.succeeded:
            badge = self._c("32;1", "🎉 SUCCESS (ALL ASSERTIONS MET)")
        else:
            badge = self._c("31;1", "⚠️ BUDGET EXHAUSTED")

        lines.append("")
        lines.append(f"🍱 Bento Autonomous Loop: {self._c('1', result.task_name)} [{badge}]")
        lines.append(f"🔄 Iterations: {result.total_iterations}/{result.max_iterations} completed")
        lines.append(f"⏱️  Total Duration: {result.total_duration_ms:.1f}ms")
        if result.committed:
            lines.append(f"💾 Git: Changes auto-committed to repository")
        if result.distilled_lessons:
            lines.append(f"🧠 Memory: Auto-distilled {len(result.distilled_lessons)} new lesson(s) into memory bank")
        lines.append("─" * 60)

        for it in result.iterations:
            pass_status = (
                self._c("32", "✓ PASSED")
                if it.scenario_result.passed
                else self._c("31", "✗ FAILED")
            )
            lines.append(f"  [Iteration {it.iteration_num}/{result.max_iterations}] -> {pass_status}")
            if not it.scenario_result.passed or verbose:
                for step in it.scenario_result.step_results:
                    if step.status != StepStatus.PASSED:
                        lines.append(f"    - Failed Step: {step.step_name}")
                        if step.error_message:
                            lines.append(f"      {self._c('33', step.error_message)}")

        if result.distilled_lessons:
            lines.append("─" * 60)
            lines.append("🧠 Distilled Lessons Added to Memory:")
            for l in result.distilled_lessons:
                lines.append(f"  - [{l.id}] {l.title} (Rule: {l.rule})")

        lines.append("─" * 60)
        if result.final_scenario_result:
            lines.append(self.format_scenario_result(result.final_scenario_result, verbose=verbose))
        return "\n".join(lines)

    def format_memory_summary(self, memory: MemoryBank) -> str:
        lines: list[str] = []
        lines.append("")
        lines.append(f"🧠 {self._c('1', 'Bento Persistent Memory Bank')} ({len(memory.lessons)} rules stored)")
        lines.append("─" * 60)
        if not memory.lessons:
            lines.append("  (Memory bank is currently empty. Run `bento auto` to discover new rules).")
        else:
            for l in memory.lessons:
                lines.append(f"  [{self._c('36', l.id)}] {self._c('1', l.title)}")
                lines.append(f"    Category: {l.category} | Discovered: {l.discovery_date}")
                lines.append(f"    Rule: {self._c('32', l.rule)}")
                if l.anti_pattern:
                    lines.append(f"    Anti-Pattern: {self._c('31', l.anti_pattern)}")
                lines.append("")
        lines.append("─" * 60)
        return "\n".join(lines)

    def format_dream_cycle_result(self, result: DreamCycleResult) -> str:
        lines: list[str] = []
        lines.append("")
        lines.append(f"🌙 {self._c('1;35', 'Bento Dream Cycle Maintenance Completed')}")
        lines.append(f"🧠 Memory Bank: {result.consolidated_lessons_count} active rules enforced ({result.new_lessons_discovered} newly harvested)")
        if result.harvested_lessons:
            lines.append("─" * 60)
            lines.append(f"✨ {self._c('1;32', 'Harvested Lessons from Yesterday\'s Logs')}:")
            for l in result.harvested_lessons:
                lines.append(f"  - [{self._c('36', l.id)}] {self._c('1', l.title)}")
                lines.append(f"    Rule: {self._c('32', l.rule)}")
                if l.anti_pattern:
                    lines.append(f"    Anti-Pattern: {self._c('31', l.anti_pattern)}")
        if result.crystallized_skills:
            lines.append("─" * 60)
            lines.append(f"🛠️  {self._c('1;34', 'Crystallized Procedural Skills')}:")
            for s in result.crystallized_skills:
                lines.append(f"  - [{self._c('33', s.name)}] {s.description}")
        lines.append(f"⏱️  Duration: {result.total_duration_ms:.1f}ms")
        lines.append("─" * 60)
        lines.append(self.format_suite_result(result.suite_result))
        return "\n".join(lines)

    def format_arena_result(self, result: ArenaResult) -> str:
        lines: list[str] = []
        status_badge = (
            self._c("32;1", "🛡️ CODE FULLY HARDENED")
            if result.hardened
            else self._c("31;1", "⚔️ UNPATCHED VULNERABILITIES DETECTED")
        )
        lines.append("")
        lines.append(f"⚔️ {self._c('1', 'Bento Adversarial Red-Team Arena')}: {result.task_name} [{status_badge}]")
        lines.append(f"🥊 Sparring Rounds: {result.total_rounds} | Exploits Found: {result.total_exploits_found} | Patched: {result.total_exploits_patched}")
        lines.append(f"⏱️  Arena Duration: {result.total_duration_ms:.1f}ms")
        lines.append("─" * 60)

        for rnd in result.rounds:
            icon = self._c("33", "💥 EXPLOIT DISCOVERED & PATCHED") if rnd.exploit_found else self._c("32", "🛡️ ATTACK RESISTED")
            lines.append(f"  [Round {rnd.round_num}/{result.total_rounds}] -> {icon}")
            lines.append(f"    Attacker Scenario: {self._c('90', rnd.attacker_contract.name)}")
            if rnd.exploit_found:
                lines.append(f"    {self._c('36', 'Builder Patch:')} Applied defense and re-verified green.")

        lines.append("─" * 60)
        return "\n".join(lines)

    def format_swarm_result(self, result: SwarmPipelineResult) -> str:
        lines: list[str] = []
        status_badge = (
            self._c("32;1", "🎉 ALL STAGES PASSED")
            if result.passed
            else self._c("31;1", "❌ PIPELINE FAILED")
        )
        lines.append("")
        lines.append(f"👥 {self._c('1', result.pipeline_name)} [{status_badge}]")
        lines.append(f"⏱️  Total Pipeline Duration: {result.total_duration_ms:.1f}ms")
        lines.append("─" * 60)

        for task in result.task_results:
            icon = self._c("32", "✓ PASSED") if task.passed else self._c("31", "✗ FAILED")
            lines.append(f"  [{task.role.value}] {task.task_name} -> {icon} ({task.duration_ms:.1f}ms)")
            lines.append(f"    Summary: {self._c('90', task.output_summary)}")
            if task.error_message:
                lines.append(f"    Error: {self._c('31', task.error_message)}")

        lines.append("─" * 60)
        return "\n".join(lines)

    def format_optimizer_result(self, result: OptimizerResult) -> str:
        lines: list[str] = []
        lines.append("")
        lines.append(f"🧬 {self._c('1', 'Bento Model & Prompt Optimizer')}: {result.suite_name}")
        lines.append(f"🏆 Top Candidate: {self._c('32;1', result.best_candidate.id)} ({result.best_candidate.model_name})")
        lines.append(f"⏱️  Benchmark Duration: {result.total_duration_ms:.1f}ms")
        lines.append("=" * 60)
        lines.append(f"  {'Rank':<5} {'Candidate ID':<20} {'Model':<15} {'Pass Rate':<12} {'Avg Latency':<12} {'Score'}")
        lines.append("─" * 60)

        for rank_idx, r in enumerate(result.rankings, 1):
            rank_str = f"#{rank_idx}"
            pass_str = f"{r.pass_rate:.1f}% ({r.passed_scenarios}/{r.total_scenarios})"
            lat_str = f"{r.avg_latency_ms:.1f}ms"
            lines.append(f"  {rank_str:<5} {r.candidate.id:<20} {r.candidate.model_name:<15} {pass_str:<12} {lat_str:<12} {r.score:.1f}")

        lines.append("=" * 60)
        return "\n".join(lines)


    def format_bg_tasks(self, tasks: list[dict]) -> str:
        lines: list[str] = []
        lines.append("")
        lines.append(f"🎩 {self._c('1', 'Bento Background Tasks (Butler Daemon)')}")
        lines.append("─" * 65)
        if not tasks:
            lines.append("  (No active or past background tasks found).")
        else:
            lines.append(f"  {'Task ID':<12} {'Tag':<15} {'Status':<12} {'PID':<8} {'Command'}")
            lines.append("─" * 65)
            for t in tasks:
                status_str = t.get("status", "UNKNOWN")
                color = "32" if status_str == "RUNNING" else ("33" if status_str == "STOPPED" else "31")
                badge = self._c(color, status_str)
                lines.append(f"  {t.get('id', ''):<12} {t.get('tag', 'task'):<15} {badge:<21} {str(t.get('pid', '')):<8} {t.get('command', '')[:25]}")
        lines.append("─" * 65)
        return "\n".join(lines)

    def format_bg_status(self, info: dict) -> str:
        lines: list[str] = []
        status_str = info.get("status", "UNKNOWN")
        color = "32;1" if status_str == "RUNNING" else "33"
        badge = self._c(color, status_str)
        lines.append("")
        lines.append(f"🎩 Bento Task: {self._c('1', info.get('id', ''))} [{badge}]")
        lines.append(f"🏷️  Tag: {info.get('tag', '')} | PID: {info.get('pid', '')}")
        lines.append(f"⏱️  Started: {info.get('started_at', '')}")
        lines.append(f"📁 Log File: {info.get('log_file', '')}")
        lines.append(f"💻 Command: {self._c('90', info.get('command', ''))}")
        lines.append("─" * 60)
        return "\n".join(lines)

    def format_json(self, result: Any) -> str:
        def serialize(obj):
            if hasattr(obj, "__dict__"):
                return {k: serialize(v) for k, v in obj.__dict__.items()}
            if isinstance(obj, list):
                return [serialize(i) for i in obj]
            if hasattr(obj, "value"):
                return obj.value
            return obj

        return json.dumps(serialize(result), indent=2)
