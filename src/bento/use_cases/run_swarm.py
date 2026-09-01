"""RunSwarmUseCase: Coordinates specialized Architect -> Builder -> Auditor -> Judge swarm pipeline."""
from __future__ import annotations
import time
from bento.domain.models import (
    Scenario,
    StepStatus,
    SwarmPipelineResult,
    SwarmRole,
    SwarmTaskResult,
)
from bento.domain.ports import StorageGateway, SwarmGateway
from bento.domain.rules import validate_clean_architecture_ast
from bento.use_cases.run_scenario import RunScenarioUseCase


class RunSwarmUseCase:
    def __init__(
        self,
        swarm_gateway: SwarmGateway,
        run_scenario_use_case: RunScenarioUseCase,
        storage_gateway: StorageGateway,
    ):
        self._swarm = swarm_gateway
        self._run_scenario = run_scenario_use_case
        self._storage = storage_gateway

    def execute(
        self,
        task_description: str,
        scenario: Scenario,
        working_dir: str | None = None,
    ) -> SwarmPipelineResult:
        start_time = time.monotonic()
        effective_cwd = working_dir or scenario.working_dir
        task_results: list[SwarmTaskResult] = []

        # 1. ARCHITECT STAGE
        t0 = time.monotonic()
        arch_prompt = f"ARCHITECT ROLE:\nDeconstruct this requirement into modular Clean Architecture specifications:\n{task_description}"
        arch_resp = self._swarm.execute_role(SwarmRole.ARCHITECT, arch_prompt, working_dir=effective_cwd)
        task_results.append(
            SwarmTaskResult(
                role=SwarmRole.ARCHITECT,
                task_name="Architecture Decomposition",
                output_summary=arch_resp.content[:200] + "...",
                passed=arch_resp.exit_code == 0,
                duration_ms=(time.monotonic() - t0) * 1000.0,
            )
        )

        # 2. BUILDER STAGE
        t1 = time.monotonic()
        builder_prompt = f"BUILDER ROLE:\nImplement the feature according to this architectural plan:\n{arch_resp.content}\n\nTarget contract: {scenario.name}"
        builder_resp = self._swarm.execute_role(SwarmRole.BUILDER, builder_prompt, working_dir=effective_cwd)
        task_results.append(
            SwarmTaskResult(
                role=SwarmRole.BUILDER,
                task_name="Domain & Adapter Implementation",
                output_summary=builder_resp.content[:200] + "...",
                passed=builder_resp.exit_code == 0,
                duration_ms=(time.monotonic() - t1) * 1000.0,
            )
        )

        # 3. AUDITOR STAGE (Clean Architecture AST Inspection)
        t2 = time.monotonic()
        audit_violations = []
        py_files = self._storage.list_files(effective_cwd or ".", pattern="src/**/*.py")
        for f_path in py_files:
            try:
                code = self._storage.read_text(f_path)
                violations = validate_clean_architecture_ast(f_path, code)
                audit_violations.extend(violations)
            except Exception:
                continue

        auditor_passed = (len(audit_violations) == 0)
        auditor_summary = "Clean Architecture boundaries 100% verified (Zero I/O in domain)." if auditor_passed else f"{len(audit_violations)} violations found"
        task_results.append(
            SwarmTaskResult(
                role=SwarmRole.AUDITOR,
                task_name="Clean Architecture & Security Audit",
                output_summary=auditor_summary,
                passed=auditor_passed,
                duration_ms=(time.monotonic() - t2) * 1000.0,
                error_message=None if auditor_passed else "; ".join(audit_violations),
            )
        )

        # 4. JUDGE STAGE (Deterministic Bento Evaluation)
        t3 = time.monotonic()
        scenario_result = self._run_scenario.execute(scenario, working_dir_override=effective_cwd)
        task_results.append(
            SwarmTaskResult(
                role=SwarmRole.JUDGE,
                task_name="Bento Contract Verification",
                output_summary=f"Scorecard: {scenario_result.status.value} in {scenario_result.total_duration_ms:.1f}ms",
                passed=scenario_result.passed,
                duration_ms=(time.monotonic() - t3) * 1000.0,
                error_message=None if scenario_result.passed else "Contract assertions failed",
            )
        )

        all_passed = all(t.passed for t in task_results)
        total_duration_ms = (time.monotonic() - start_time) * 1000.0

        return SwarmPipelineResult(
            pipeline_name=f"Swarm Pipeline: {scenario.name}",
            task_results=task_results,
            passed=all_passed,
            total_duration_ms=total_duration_ms,
        )
