"""Unit tests for Bento Domain Models (Pure, Zero I/O)."""
import unittest
from bento.domain.models import (
    Assertion,
    AssertionType,
    Scenario,
    ScenarioResult,
    Step,
    StepResult,
    StepStatus,
    SuiteResult,
)


class TestDomainModels(unittest.TestCase):
    def test_scenario_result_passed_property(self):
        res = ScenarioResult(
            scenario_name="test",
            status=StepStatus.PASSED,
            step_results=[],
            total_duration_ms=10.0,
        )
        self.assertTrue(res.passed)

        res_fail = ScenarioResult(
            scenario_name="test",
            status=StepStatus.FAILED,
            step_results=[],
            total_duration_ms=10.0,
        )
        self.assertFalse(res_fail.passed)

    def test_suite_result_pass_rate(self):
        suite = SuiteResult(
            suite_name="test suite",
            total_scenarios=4,
            passed_scenarios=3,
            failed_scenarios=1,
            total_duration_ms=100.0,
            scenario_results=[],
        )
        self.assertEqual(suite.pass_rate, 75.0)
        self.assertFalse(suite.all_passed)
