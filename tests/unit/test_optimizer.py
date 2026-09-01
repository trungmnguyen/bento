"""Unit tests for Bento Level 4 Model & Prompt Optimizer."""
import unittest
from bento.domain.models import OptimizerCandidate, Scenario, Step
from bento.use_cases.optimize_prompts import OptimizePromptsUseCase
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class TestOptimizer(unittest.TestCase):
    def test_optimizer_ranks_candidates_properly(self):
        class AccuracyAwareExecution:
            def __init__(self):
                self.calls = 0
            def execute_command(self, command, cwd=None, env=None, timeout_sec=30.0):
                self.calls += 1
                # Candidate 1 (calls == 1): exit code 0 (100% pass)
                # Candidate 2 (calls == 2): exit code 1 (0% pass)
                exit_code = 0 if self.calls == 1 else 1
                return exit_code, "OK", "", 10.0

        scenario_uc = RunScenarioUseCase(execution_gateway=AccuracyAwareExecution())
        suite_uc = RunSuiteUseCase(run_scenario_use_case=scenario_uc)
        opt_uc = OptimizePromptsUseCase(run_suite_use_case=suite_uc)

        candidates = [
            OptimizerCandidate(id="cand-1-accurate", model_name="Claude 3.7", system_prompt_variant="v1"),
            OptimizerCandidate(id="cand-2-buggy", model_name="Gemini 2.0", system_prompt_variant="v2"),
        ]
        scenarios = [Scenario(name="S1", steps=[Step(name="Step", command="echo 1")])]

        result = opt_uc.execute(candidates=candidates, scenarios=scenarios)
        self.assertEqual(len(result.rankings), 2)
        self.assertEqual(result.best_candidate.id, "cand-1-accurate")
        self.assertEqual(result.rankings[0].pass_rate, 100.0)
        self.assertEqual(result.rankings[1].pass_rate, 0.0)
