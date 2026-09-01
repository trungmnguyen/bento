"""RunScenarioUseCase: Orchestrates execution and assertion verification of a single Scenario.

Depends ONLY on the Domain layer.
"""
from __future__ import annotations
import time
from typing import Any
from bento.domain.exceptions import ScenarioValidationError
from bento.domain.models import (
    Assertion,
    AssertionResult,
    AssertionType,
    Scenario,
    ScenarioResult,
    Step,
    StepResult,
    StepStatus,
)
from bento.domain.ports import ExecutionGateway
from bento.domain.rules import determine_step_status, evaluate_assertion, validate_scenario


class RunScenarioUseCase:
    def __init__(self, execution_gateway: ExecutionGateway):
        self._execution_gateway = execution_gateway

    def execute(self, scenario: Scenario, working_dir_override: str | None = None) -> ScenarioResult:
        errors = validate_scenario(scenario)
        if errors:
            raise ScenarioValidationError(errors)

        start_time = time.monotonic()
        step_results: list[StepResult] = []
        overall_status = StepStatus.PASSED
        effective_cwd = working_dir_override or scenario.working_dir

        for step in scenario.steps:
            step_result = self._execute_step_with_retries(step, effective_cwd)
            step_results.append(step_result)

            if step_result.status != StepStatus.PASSED:
                overall_status = StepStatus.FAILED
                break

        total_duration_ms = (time.monotonic() - start_time) * 1000.0

        return ScenarioResult(
            scenario_name=scenario.name,
            status=overall_status,
            step_results=step_results,
            total_duration_ms=total_duration_ms,
            loop_iterations=1,
            metadata=scenario.metadata,
        )

    def _execute_step_with_retries(self, step: Step, cwd: str | None) -> StepResult:
        attempts = 0
        max_attempts = max(1, step.max_retries + 1)
        effective_step_cwd = step.cwd or cwd

        last_result: StepResult | None = None

        while attempts < max_attempts:
            attempts += 1
            try:
                exit_code, stdout, stderr, duration_ms = self._execution_gateway.execute_command(
                    command=step.command,
                    cwd=effective_step_cwd,
                    env=step.env,
                    timeout_sec=step.timeout_sec,
                )

                output_data = {
                    "stdout": stdout,
                    "stderr": stderr,
                    "exit_code": exit_code,
                    "duration_ms": duration_ms,
                }

                # Evaluate assertions (if no assertions specified, default to exit_code == 0)
                assertion_results: list[AssertionResult] = []
                if step.assertions:
                    for assertion in step.assertions:
                        res = evaluate_assertion(assertion, output_data)
                        assertion_results.append(res)
                else:
                    default_assertion = Assertion(
                        type=AssertionType.EXIT_CODE_EQUALS,
                        expected=0,
                        target_field="exit_code",
                        description="Default zero exit code verification",
                    )
                    assertion_results.append(evaluate_assertion(default_assertion, output_data))

                status = determine_step_status(assertion_results, exit_code)

                last_result = StepResult(
                    step_name=step.name,
                    command=step.command,
                    status=status,
                    exit_code=exit_code,
                    stdout=stdout,
                    stderr=stderr,
                    duration_ms=duration_ms,
                    assertion_results=assertion_results,
                    error_message=None if status == StepStatus.PASSED else "Assertions failed",
                )

                if status == StepStatus.PASSED:
                    return last_result

            except Exception as e:
                last_result = StepResult(
                    step_name=step.name,
                    command=step.command,
                    status=StepStatus.ERROR,
                    exit_code=-1,
                    stdout="",
                    stderr=str(e),
                    duration_ms=0.0,
                    assertion_results=[],
                    error_message=str(e),
                )

        return last_result or StepResult(
            step_name=step.name,
            command=step.command,
            status=StepStatus.FAILED,
            exit_code=-1,
            stdout="",
            stderr="Unknown error during execution",
            duration_ms=0.0,
            assertion_results=[],
        )
