"""AutoLoopUseCase: Autonomous closed-loop iteration engine with Memory Injection & Auto-Distillation."""
from __future__ import annotations
import datetime
import time
from bento.domain.models import (
    AutoLoopIteration,
    AutoLoopResult,
    AutoLoopStatus,
    MemoryLesson,
    Scenario,
    ScenarioResult,
    TraceEvent,
)
from bento.domain.ports import AgentGateway, GitGateway, MemoryGateway, TraceGateway
from bento.domain.rules import (
    build_corrective_agent_prompt,
    build_initial_agent_prompt,
    filter_relevant_lessons,
)
from bento.use_cases.distill_memory import DistillMemoryUseCase
from bento.use_cases.run_scenario import RunScenarioUseCase


class AutoLoopUseCase:
    def __init__(
        self,
        agent_gateway: AgentGateway,
        run_scenario_use_case: RunScenarioUseCase,
        git_gateway: GitGateway | None = None,
        memory_gateway: MemoryGateway | None = None,
        trace_gateway: TraceGateway | None = None,
    ):
        self._agent_gateway = agent_gateway
        self._run_scenario = run_scenario_use_case
        self._git_gateway = git_gateway
        self._memory_gateway = memory_gateway
        self._trace_gateway = trace_gateway

    def execute(
        self,
        task_description: str,
        scenario: Scenario,
        max_iterations: int = 5,
        working_dir: str | None = None,
        auto_commit: bool = False,
        commit_message: str | None = None,
        auto_distill: bool = True,
    ) -> AutoLoopResult:
        start_time = time.monotonic()
        iterations: list[AutoLoopIteration] = []
        last_scenario_result: ScenarioResult | None = None
        effective_cwd = working_dir or scenario.working_dir

        # 1. Retrieve relevant memory lessons from past runs
        relevant_lessons: list[MemoryLesson] = []
        if self._memory_gateway:
            memory_bank = self._memory_gateway.load_memory(working_dir=effective_cwd)
            relevant_lessons = filter_relevant_lessons(
                memory_bank=memory_bank,
                tags=scenario.tags,
                task_description=task_description,
            )

        for i in range(1, max_iterations + 1):
            # Synthesize prompt with injected memory on iteration 1
            if i == 1:
                prompt = build_initial_agent_prompt(
                    task_description=task_description,
                    scenario=scenario,
                    relevant_lessons=relevant_lessons,
                )
            else:
                assert last_scenario_result is not None
                prompt = build_corrective_agent_prompt(task_description, last_scenario_result, i - 1)

            # Builder step: Agent performs the work
            agent_response = self._agent_gateway.execute_agent_task(prompt, working_dir=effective_cwd)

            # Judge step: Bento evaluates the scenario contract
            scenario_result = self._run_scenario.execute(scenario, working_dir_override=effective_cwd)
            last_scenario_result = scenario_result

            iteration_record = AutoLoopIteration(
                iteration_num=i,
                prompt_sent=prompt,
                agent_response=agent_response,
                scenario_result=scenario_result,
            )
            iterations.append(iteration_record)

            if self._trace_gateway:
                now_iso = datetime.datetime.now().isoformat()
                failed_msgs = [a.message for a in scenario_result.failed_assertions]
                event = TraceEvent(
                    timestamp=now_iso,
                    task_name=scenario.name,
                    iteration=i,
                    event_type="iteration",
                    prompt_sent=prompt[:500],
                    agent_output=agent_response.content[:500],
                    exit_code=agent_response.exit_code,
                    passed=scenario_result.passed,
                    failed_assertions=failed_msgs,
                    tags=scenario.tags,
                )
                self._trace_gateway.append_trace_event(event, working_dir=effective_cwd)

            # Check for completion
            if scenario_result.passed:
                committed = False
                if auto_commit and self._git_gateway:
                    msg = commit_message or f"feat: fulfilled bento task '{scenario.name}' on iteration {i}"
                    committed = self._git_gateway.commit_changes(msg, working_dir=effective_cwd)

                # 3. Auto-distill lessons learned into persistent memory
                distilled_lessons: list[MemoryLesson] = []
                if auto_distill and self._memory_gateway and i > 1:
                    distill_uc = DistillMemoryUseCase(memory_gateway=self._memory_gateway)
                    distilled_lessons = distill_uc.execute(
                        task_name=scenario.name,
                        scenario=scenario,
                        loop_result=AutoLoopResult(
                            task_name=scenario.name,
                            status=AutoLoopStatus.SUCCESS,
                            total_iterations=i,
                            max_iterations=max_iterations,
                            iterations=iterations,
                            final_scenario_result=scenario_result,
                            total_duration_ms=0.0,
                        ),
                        working_dir=effective_cwd,
                    )

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
                    distilled_lessons=distilled_lessons,
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
            distilled_lessons=[],
        )
