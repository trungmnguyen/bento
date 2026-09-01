"""RunSuiteUseCase: Orchestrates execution of multi-scenario benchmark suites."""
from __future__ import annotations
import time
from bento.domain.models import Scenario, StepStatus, SuiteResult
from bento.use_cases.run_scenario import RunScenarioUseCase


class RunSuiteUseCase:
    def __init__(self, run_scenario_use_case: RunScenarioUseCase):
        self._run_scenario_use_case = run_scenario_use_case

    def execute(self, scenarios: list[Scenario], suite_name: str = "Bento Suite") -> SuiteResult:
        start_time = time.monotonic()
        scenario_results = []
        passed_count = 0
        failed_count = 0

        for scenario in scenarios:
            result = self._run_scenario_use_case.execute(scenario)
            scenario_results.append(result)
            if result.status == StepStatus.PASSED:
                passed_count += 1
            else:
                failed_count += 1

        total_duration_ms = (time.monotonic() - start_time) * 1000.0

        return SuiteResult(
            suite_name=suite_name,
            total_scenarios=len(scenarios),
            passed_scenarios=passed_count,
            failed_scenarios=failed_count,
            total_duration_ms=total_duration_ms,
            scenario_results=scenario_results,
        )
