"""AutoLoopUseCase: Autonomous closed-loop iteration engine.

Drives the Builder (AgentGateway) and the Judge (RunScenarioUseCase)
until all ground-truth contract assertions are green or max iterations are reached.
"""
from __future__ import annotations
import time
from bento.domain.models import (
    AutoLoopIteration,
    AutoLoopResult,
    AutoLoopStatus,
    Scenario,
    ScenarioResult,
)
from bento.domain.ports import AgentGateway, GitGateway
from bento.domain.rules import (
    build_corrective_agent_prompt,
    build_initial_agent_prompt,
)
from bento.use_cases.run_scenario import RunScenarioUseCase


class AutoLoopUseCase:
    def __init__(
        self,
        agent_gateway: AgentGateway,
        run_scenario_use_case: RunScenarioUseCase,
        git_gateway: GitGateway | None = None,
    ):
        self._agent_gateway = agent_gateway
        self._run_scenario = run_scenario_use_case
        self._git_gateway = git_gateway

    def execute(
        self,
        task_description: str,
        scenario: Scenario,
        max_iterations: int = 5,
        working_dir: str | None = None,
        auto_commit: bool = False,
        commit_message: str | None = None,
    ) -> AutoLoopResult:
        start_time = time.monotonic()
        iterations: list[AutoLoopIteration] = []
        last_scenario_result: ScenarioResult | None = None
        effective_cwd = working_dir or scenario.working_dir

        for i in range(1, max_iterations + 1):
            # Synthesize prompt
            if i == 1:
                prompt = build_initial_agent_prompt(task_description, scenario)
            else:
                assert last_scenario_result is not None
                prompt = build_corrective_agent_prompt(task_description, last_scenario_result, i - 1)

            # 1. Builder step: Agent performs the work
            agent_response = self._agent_gateway.execute_agent_task(prompt, working_dir=effective_cwd)

            # 2. Judge step: Bento evaluates the scenario contract
            scenario_result = self._run_scenario.execute(scenario, working_dir_override=effective_cwd)
            last_scenario_result = scenario_result

            iteration_record = AutoLoopIteration(
                iteration_num=i,
                prompt_sent=prompt,
                agent_response=agent_response,
                scenario_result=scenario_result,
            )
            iterations.append(iteration_record)

            # 3. Check for completion
            if scenario_result.passed:
                committed = False
                if auto_commit and self._git_gateway:
                    msg = commit_message or f"feat: fulfilled bento task '{scenario.name}' on iteration {i}"
                    committed = self._git_gateway.commit_changes(msg, working_dir=effective_cwd)

                total_duration_ms = (time.monotonic() - start_time) * 1000.0
                return AutoLoopResult(
                    task_name=scenario.name,
                    status=AutoLoopStatus.SUCCESS,
                    total_iterations=i,
                    max_iterations=max_iterations,
                    iterations=iterations,
                    final_scenario_result=scenario_result,
                    total_duration_ms=total_duration_ms,
                    committed=committed,
                )

        total_duration_ms = (time.monotonic() - start_time) * 1000.0
        return AutoLoopResult(
            task_name=scenario.name,
            status=AutoLoopStatus.BUDGET_EXHAUSTED,
            total_iterations=max_iterations,
            max_iterations=max_iterations,
            iterations=iterations,
            final_scenario_result=last_scenario_result,
            total_duration_ms=total_duration_ms,
            committed=False,
        )
