"""OptimizePromptsUseCase: Evaluates multiple model/prompt candidates across benchmark suites."""
from __future__ import annotations
import time
from bento.domain.models import (
    OptimizerCandidate,
    OptimizerResult,
    Scenario,
)
from bento.domain.rules import rank_optimizer_candidates
from bento.use_cases.run_suite import RunSuiteUseCase


class OptimizePromptsUseCase:
    def __init__(self, run_suite_use_case: RunSuiteUseCase):
        self._run_suite = run_suite_use_case

    def execute(
        self,
        candidates: list[OptimizerCandidate],
        scenarios: list[Scenario],
        suite_name: str = "Bento Optimization Battery",
    ) -> OptimizerResult:
        start_time = time.monotonic()
        candidate_results = []

        for cand in candidates:
            # Run suite against candidate
            suite_res = self._run_suite.execute(scenarios, suite_name=f"{suite_name} [{cand.id}]")
            candidate_results.append((cand, suite_res))

        rankings = rank_optimizer_candidates(candidate_results)
        best_candidate = rankings[0].candidate if rankings else candidates[0]
        total_duration_ms = (time.monotonic() - start_time) * 1000.0

        return OptimizerResult(
            suite_name=suite_name,
            best_candidate=best_candidate,
            rankings=rankings,
            total_duration_ms=total_duration_ms,
        )
