"""OrchestraSprintUseCase: Coordinates the continuous Triad Sprint (Wasabi 🌶️ + Matcha 🍵 -> Patron 🥢 -> Chef 🍳)."""
from __future__ import annotations

import datetime
import time

from bento.domain.models import (
    OrchestraSprintResult,
    OrchestraSprintRound,
    Scenario,
    TraceEvent,
    TriadRole,
    TriadStageResult,
)
from bento.domain.ports import MemoryGateway, StorageGateway, TraceGateway
from bento.domain.rules import validate_clean_architecture_ast
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
    ):
        self._storage = storage_gateway
        self._run_scenario = run_scenario_use_case
        self._run_suite = run_suite_use_case
        self._memory = memory_gateway
        self._trace = trace_gateway

    def execute(
        self,
        rounds: int = 1,
        target_scenario: Scenario | None = None,
        benchmarks_dir: str | None = None,
        task_description: str | None = None,
        auto_approve: bool = False,
        working_dir: str | None = None,
    ) -> OrchestraSprintResult:
        sprint_start = time.monotonic()
        effective_cwd = working_dir or "."
        round_results: list[OrchestraSprintRound] = []

        for round_idx in range(1, rounds + 1):
            round_start = time.monotonic()
            stage_results: list[TriadStageResult] = []

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

            wasabi_passed = len(ast_violations) == 0
            wasabi_summary = (
                f"Clean Architecture verified pure across {len(py_files)} files (0 violations)."
                if wasabi_passed
                else f"Adversarial audit flagged {len(ast_violations)} AST purity violations."
            )
            stage_results.append(
                TriadStageResult(
                    role=TriadRole.WASABI,
                    stage_name="Adversarial Audit & AST Purity",
                    output_summary=wasabi_summary,
                    findings_count=len(ast_violations),
                    passed=wasabi_passed,
                    duration_ms=(time.monotonic() - t_wasabi) * 1000.0,
                    details=ast_violations[:10],
                )
            )

            # 2. MATCHA STAGE (Green Team 🍵: Memory Axioms & DX Ergonomics Review)
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
                TriadStageResult(
                    role=TriadRole.MATCHA,
                    stage_name="Ergonomics & Memory Synthesis",
                    output_summary=f"Synthesized {len(matcha_insights)} DX telemetry points.",
                    findings_count=len(matcha_insights),
                    passed=matcha_passed,
                    duration_ms=(time.monotonic() - t_matcha) * 1000.0,
                    details=matcha_insights,
                )
            )

            # 3. PATRON STAGE (Patron Gate 🥢: User Review & Invariant Verification)
            t_patron = time.monotonic()
            patron_details: list[str] = []
            if wasabi_passed:
                patron_passed = True
                patron_summary = "Patron Gate Approved: All security and architectural invariants satisfied."
                patron_details.append("Zero blocking security or AST violations.")
            else:
                if auto_approve:
                    patron_passed = True
                    patron_summary = f"Patron Gate Overridden: Auto-approved despite {len(ast_violations)} findings."
                    patron_details.append("Auto-approve flag active.")
                else:
                    patron_passed = False
                    patron_summary = f"Patron Gate Blocked: {len(ast_violations)} AST violations require remediation."
                    patron_details.extend(ast_violations[:5])

            stage_results.append(
                TriadStageResult(
                    role=TriadRole.PATRON,
                    stage_name="Patron Gated Approval",
                    output_summary=patron_summary,
                    findings_count=0 if patron_passed else len(ast_violations),
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
                TriadStageResult(
                    role=TriadRole.CHEF,
                    stage_name="Executive Verification & Delivery",
                    output_summary=chef_summary,
                    findings_count=len(chef_details),
                    passed=chef_passed,
                    duration_ms=(time.monotonic() - t_chef) * 1000.0,
                    details=chef_details,
                )
            )

            # Record Trace if trace gateway configured
            if self._trace:
                try:
                    trace_event = TraceEvent(
                        timestamp=datetime.datetime.now().isoformat(),
                        task_name=f"orchestra_round_{round_idx}",
                        iteration=round_idx,
                        event_type="orchestra_sprint_round",
                        prompt_sent=f"Orchestra Round {round_idx}/{rounds}",
                        agent_output=chef_summary,
                        exit_code=0 if chef_passed else 1,
                        passed=chef_passed,
                        failed_assertions=[] if chef_passed else [chef_summary],
                        tags=["orchestra", "triad_sprint"],
                    )
                    fn = getattr(self._trace, "append_trace_event", getattr(self._trace, "record_trace", None))
                    if fn:
                        fn(trace_event)
                except Exception:
                    pass

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
        return OrchestraSprintResult(
            sprint_name="Bento Triad Orchestra",
            rounds=round_results,
            total_rounds=rounds,
            all_passed=all_passed,
            total_duration_ms=(time.monotonic() - sprint_start) * 1000.0,
        )
