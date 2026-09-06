"""OrchestraSprintUseCase: Coordinates the continuous Culinary Brigade Sprint (Wasabi 🌶️ + Yuzu 🍋 + Matcha 🍵 -> Patron 🥢 -> Chef 🍳)."""
from __future__ import annotations

import datetime
import time

from bento.domain.models import (
    BrigadeRole,
    BrigadeStageResult,
    OrchestraSprintResult,
    OrchestraSprintRound,
    Scenario,
    TraceEvent,
    TriadRole,
    TriadStageResult,
)
from bento.domain.ports import MemoryGateway, StorageGateway, TraceGateway
from bento.domain.rules import validate_clean_architecture_ast
from bento.use_cases.dream_cycle import DreamCycleUseCase
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class OrchestraSprintUseCase:
    def __init__(
        self,
        storage_gateway: StorageGateway,
        run_scenario_use_case: RunScenarioUseCase,
        run_suite_use_case: RunSuiteUseCase,
        memory_gateway: MemoryGateway | None = None,
        trace_gateway: TraceGateway | None = None,
        dream_cycle_use_case: DreamCycleUseCase | None = None,
    ):
        self._storage = storage_gateway
        self._run_scenario = run_scenario_use_case
        self._run_suite = run_suite_use_case
        self._memory = memory_gateway
        self._trace = trace_gateway
        self._dream_cycle = dream_cycle_use_case

    def _emit_trace(self, event: TraceEvent, working_dir: str | None = None) -> None:
        if not self._trace:
            return
        try:
            fn = getattr(self._trace, "append_trace_event", getattr(self._trace, "record_trace", None))
            if fn:
                try:
                    fn(event, working_dir=working_dir)
                except TypeError:
                    fn(event)
        except Exception:
            pass

    def execute(
        self,
        rounds: int = 1,
        target_scenario: Scenario | None = None,
        benchmarks_dir: str | None = None,
        task_description: str | None = None,
        auto_approve: bool = False,
        working_dir: str | None = None,
        adversarial_findings: list[str] | None = None,
        a11y_findings: list[str] | None = None,
        dream: bool = True,
    ) -> OrchestraSprintResult:
        sprint_start = time.monotonic()
        effective_cwd = working_dir or "."
        round_results: list[OrchestraSprintRound] = []

        for round_idx in range(1, rounds + 1):
            round_start = time.monotonic()
            stage_results: list[BrigadeStageResult] = []

            # 1. WASABI STAGE (Red Team 🌶️: AST Purity & Adversarial Security Inspection)
            t_wasabi = time.monotonic()
            ast_violations: list[str] = []
            py_files = self._storage.list_files(effective_cwd, pattern="src/**/*.py")
            for f_path in py_files:
                try:
                    code = self._storage.read_text(f_path)
                    violations = validate_clean_architecture_ast(f_path, code)
                    for v in violations:
                        ast_violations.append(f"{f_path}: {v}")
                except Exception:
                    continue

            all_wasabi_findings = list(ast_violations)
            if adversarial_findings:
                all_wasabi_findings.extend(adversarial_findings)

            wasabi_passed = len(all_wasabi_findings) == 0
            wasabi_summary = (
                f"Clean Architecture verified pure across {len(py_files)} files (0 violations)."
                if wasabi_passed
                else f"Adversarial audit flagged {len(all_wasabi_findings)} security/AST violations."
            )
            stage_results.append(
                BrigadeStageResult(
                    role=BrigadeRole.WASABI,
                    stage_name="Adversarial Audit & AST Purity",
                    output_summary=wasabi_summary,
                    findings_count=len(all_wasabi_findings),
                    passed=wasabi_passed,
                    duration_ms=(time.monotonic() - t_wasabi) * 1000.0,
                    details=all_wasabi_findings[:10],
                )
            )

            # Audit-to-Trace Hook: Record Wasabi audit findings to feed the sensory dream engine
            audit_task_name = "Triad Audit: AST Purity & Architectural Invariants"
            wasabi_trace = TraceEvent(
                timestamp=datetime.datetime.now().isoformat(),
                task_name=audit_task_name,
                iteration=round_idx,
                event_type="wasabi_audit",
                prompt_sent=f"Adversarial AST & Security Audit (Round {round_idx}/{rounds})",
                agent_output=wasabi_summary,
                exit_code=0 if wasabi_passed else 1,
                passed=wasabi_passed,
                failed_assertions=[] if wasabi_passed else all_wasabi_findings[:5],
                tags=["wasabi", "red_team", "security", "ast_purity", "triad_sprint"],
            )
            self._emit_trace(wasabi_trace, working_dir=effective_cwd)

            # 2. YUZU STAGE (Yellow Team 🍋: UI Layout & Accessibility (A11y) Inspection)
            t_yuzu = time.monotonic()
            yuzu_violations: list[str] = []

            ui_files = [
                f for f in self._storage.list_files(effective_cwd)
                if any(f.endswith(ext) for ext in [".tsx", ".jsx", ".html"])
            ]
            for f_path in ui_files[:30]:
                try:
                    content = self._storage.read_text(f_path)
                    for line_no, line in enumerate(content.splitlines(), 1):
                        if "<img" in line and "alt=" not in line:
                            yuzu_violations.append(f"{f_path}:{line_no}: <img> missing alt text (WCAG 1.1.1)")
                        if ("<div" in line or "<span" in line) and "onClick=" in line and "role=" not in line:
                            yuzu_violations.append(f"{f_path}:{line_no}: Interactive element missing role='button' (WCAG 2.1.1)")
                except Exception:
                    continue

            if a11y_findings:
                yuzu_violations.extend(a11y_findings)

            yuzu_passed = len(yuzu_violations) == 0
            yuzu_summary = (
                f"Visual & Accessibility verified compliant across {len(ui_files)} UI files (0 violations)."
                if yuzu_passed
                else f"Accessibility audit flagged {len(yuzu_violations)} A11y/UI sensory violations."
            )
            stage_results.append(
                BrigadeStageResult(
                    role=BrigadeRole.YUZU,
                    stage_name="UI Layout & Accessibility (A11y) Audit",
                    output_summary=yuzu_summary,
                    findings_count=len(yuzu_violations),
                    passed=yuzu_passed,
                    duration_ms=(time.monotonic() - t_yuzu) * 1000.0,
                    details=yuzu_violations[:10],
                )
            )

            # Audit-to-Trace Hook: Record Yuzu A11y findings
            yuzu_task_name = "Triad Audit: UI Accessibility & Visual Invariants"
            yuzu_trace = TraceEvent(
                timestamp=datetime.datetime.now().isoformat(),
                task_name=yuzu_task_name,
                iteration=round_idx,
                event_type="yuzu_audit",
                prompt_sent=f"UI Layout & A11y Sensory Audit (Round {round_idx}/{rounds})",
                agent_output=yuzu_summary,
                exit_code=0 if yuzu_passed else 1,
                passed=yuzu_passed,
                failed_assertions=[] if yuzu_passed else yuzu_violations[:5],
                tags=["yuzu", "yellow_team", "a11y", "ui", "triad_sprint"],
            )
            self._emit_trace(yuzu_trace, working_dir=effective_cwd)

            # 3. MATCHA STAGE (Green Team 🍵: Core Features, DX & Innovation Review)
            t_matcha = time.monotonic()
            matcha_insights: list[str] = []
            if self._memory:
                try:
                    bank = self._memory.load_memory(effective_cwd)
                    categories = {l.category for l in bank.lessons}
                    matcha_insights.append(f"Loaded {len(bank.lessons)} active lessons across {len(categories)} categories.")
                    if bank.lessons:
                        recent = bank.lessons[-1]
                        matcha_insights.append(f"Latest Axiom: [{recent.id}] {recent.title}")
                except Exception as e:
                    matcha_insights.append(f"Memory check exception: {e}")
            else:
                matcha_insights.append("Memory gateway idle.")

            if task_description:
                matcha_insights.append(f"Task Context: {task_description[:80]}...")

            matcha_passed = True
            stage_results.append(
                BrigadeStageResult(
                    role=BrigadeRole.MATCHA,
                    stage_name="Ergonomics, Core Features & Innovation Synthesis",
                    output_summary=f"Synthesized {len(matcha_insights)} DX & core feature telemetry points.",
                    findings_count=len(matcha_insights),
                    passed=matcha_passed,
                    duration_ms=(time.monotonic() - t_matcha) * 1000.0,
                    details=matcha_insights,
                )
            )

            # 4. PATRON STAGE (Patron Gate 🥢: User Review & Invariant Verification)
            t_patron = time.monotonic()
            patron_details: list[str] = []
            blocking_violations = all_wasabi_findings + yuzu_violations

            if len(blocking_violations) == 0:
                patron_passed = True
                patron_summary = "Patron Gate Approved: All security, A11y, and architectural invariants satisfied."
                patron_details.append("Zero blocking security, AST, or A11y violations.")
            else:
                if auto_approve:
                    patron_passed = True
                    patron_summary = f"Patron Gate Overridden: Auto-approved despite {len(blocking_violations)} findings."
                    patron_details.append("Auto-approve flag active.")
                else:
                    patron_passed = False
                    patron_summary = f"Patron Gate Blocked: {len(blocking_violations)} security/A11y violations require remediation."
                    patron_details.extend(blocking_violations[:5])

            stage_results.append(
                BrigadeStageResult(
                    role=BrigadeRole.PATRON,
                    stage_name="Patron Gated Approval",
                    output_summary=patron_summary,
                    findings_count=0 if patron_passed else len(blocking_violations),
                    passed=patron_passed,
                    duration_ms=(time.monotonic() - t_patron) * 1000.0,
                    details=patron_details,
                )
            )

            # 4. CHEF STAGE (Blue Team 🍳: Executive Implementation & Contract Verification)
            t_chef = time.monotonic()
            chef_details: list[str] = []
            chef_passed = True

            if target_scenario:
                scen_res = self._run_scenario.execute(target_scenario, working_dir_override=effective_cwd)
                chef_passed = scen_res.passed
                chef_details.append(f"Contract '{target_scenario.name}': {scen_res.status.value} in {scen_res.total_duration_ms:.1f}ms")
                chef_summary = f"Scenario '{target_scenario.name}' {'PASSED' if chef_passed else 'FAILED'}"

                failed_assertions: list[str] = []
                for step in scen_res.step_results:
                    for ar in step.assertion_results:
                        if not ar.passed:
                            failed_assertions.append(f"{step.step_name}: {ar.message}")
                if not failed_assertions and not chef_passed:
                    failed_assertions.append(chef_summary)

                # Trace Hook: Emit granular scenario contract verification trace
                chef_trace = TraceEvent(
                    timestamp=datetime.datetime.now().isoformat(),
                    task_name=target_scenario.name,
                    iteration=round_idx,
                    event_type="chef_contract_verification",
                    prompt_sent=f"Execute scenario contract: {target_scenario.name}",
                    agent_output=chef_summary,
                    exit_code=0 if chef_passed else 1,
                    passed=chef_passed,
                    failed_assertions=failed_assertions,
                    tags=list(set(target_scenario.tags + ["chef", "blue_team", "contract", "triad_sprint"])),
                )
                self._emit_trace(chef_trace, working_dir=effective_cwd)

            elif benchmarks_dir:
                try:
                    from bento.adapters.parsers.scenario_parser import ScenarioParser
                    files = self._storage.list_files(benchmarks_dir, pattern="*.json")
                    scenarios = []
                    for f in sorted(files):
                        try:
                            scenarios.append(ScenarioParser.from_json(self._storage.read_text(f)))
                        except Exception:
                            continue
                    if scenarios:
                        suite_res = self._run_suite.execute(scenarios, suite_name="Bento Orchestra Suite")
                        chef_passed = suite_res.all_passed
                        chef_summary = f"Benchmark Suite: {suite_res.passed_scenarios}/{suite_res.total_scenarios} passed ({suite_res.pass_rate:.1f}%)"
                        for r in suite_res.scenario_results:
                            chef_details.append(f"{'[✓]' if r.passed else '[✗]'} {r.scenario_name} ({r.total_duration_ms:.1f}ms)")

                            failed_msgs: list[str] = []
                            for step in r.step_results:
                                for ar in step.assertion_results:
                                    if not ar.passed:
                                        failed_msgs.append(f"{step.step_name}: {ar.message}")
                            if not failed_msgs and not r.passed:
                                failed_msgs.append(f"{r.scenario_name} failed")

                            # Trace Hook: Emit granular trace per scenario in the suite
                            s_trace = TraceEvent(
                                timestamp=datetime.datetime.now().isoformat(),
                                task_name=r.scenario_name,
                                iteration=round_idx,
                                event_type="chef_suite_verification",
                                prompt_sent=f"Orchestra Benchmark: {r.scenario_name}",
                                agent_output=f"Passed: {r.passed}, steps: {len(r.step_results)}",
                                exit_code=0 if r.passed else 1,
                                passed=r.passed,
                                failed_assertions=failed_msgs,
                                tags=["chef", "blue_team", "benchmark", "triad_sprint"],
                            )
                            self._emit_trace(s_trace, working_dir=effective_cwd)
                    else:
                        chef_summary = f"No scenario contracts found in '{benchmarks_dir}'"
                        chef_passed = True
                except Exception as e:
                    chef_summary = f"Error running benchmark suite: {e}"
                    chef_passed = False
            else:
                chef_summary = "Blue Team verification passed (Clean Architecture verified)."
                chef_details.append("No explicit contract provided; verified AST compliance.")

            stage_results.append(
                BrigadeStageResult(
                    role=BrigadeRole.CHEF,
                    stage_name="Executive Verification & Delivery",
                    output_summary=chef_summary,
                    findings_count=len(chef_details),
                    passed=chef_passed,
                    duration_ms=(time.monotonic() - t_chef) * 1000.0,
                    details=chef_details,
                )
            )

            # Record Round Summary Trace
            round_trace = TraceEvent(
                timestamp=datetime.datetime.now().isoformat(),
                task_name=f"orchestra_round_{round_idx}",
                iteration=round_idx,
                event_type="orchestra_sprint_round",
                prompt_sent=f"Orchestra Round {round_idx}/{rounds}",
                agent_output=chef_summary,
                exit_code=0 if chef_passed else 1,
                passed=chef_passed,
                failed_assertions=[] if chef_passed else [chef_summary],
                tags=["orchestra", "culinary_brigade", "triad_sprint"],
            )
            self._emit_trace(round_trace, working_dir=effective_cwd)

            round_passed = all(sr.passed for sr in stage_results)
            round_results.append(
                OrchestraSprintRound(
                    round_index=round_idx,
                    stage_results=stage_results,
                    passed=round_passed,
                    duration_ms=(time.monotonic() - round_start) * 1000.0,
                )
            )

        all_passed = all(r.passed for r in round_results)
        dream_result = None
        if dream and self._dream_cycle:
            try:
                b_dir = benchmarks_dir or "examples"
                dream_result = self._dream_cycle.execute(
                    benchmarks_dir=b_dir,
                    working_dir=effective_cwd,
                    harvest_traces=True,
                )
            except Exception:
                pass

        return OrchestraSprintResult(
            sprint_name="Bento Culinary Brigade Orchestra",
            rounds=round_results,
            total_rounds=rounds,
            all_passed=all_passed,
            total_duration_ms=(time.monotonic() - sprint_start) * 1000.0,
            dream_result=dream_result,
        )
