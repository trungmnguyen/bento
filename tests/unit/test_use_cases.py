"""Unit tests for Bento Use Cases using in-memory mock gateways."""
import unittest
from bento.domain.models import Assertion, AssertionType, Scenario, Step, StepStatus
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class MockExecutionGateway:
    def __init__(self, exit_code: int = 0, stdout: str = "output ok", stderr: str = ""):
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.executed_commands = []

    def execute_command(self, command: str, cwd=None, env=None, timeout_sec=30.0):
        self.executed_commands.append(command)
        return self.exit_code, self.stdout, self.stderr, 12.5


class TestUseCases(unittest.TestCase):
    def test_run_scenario_success(self):
        mock_exec = MockExecutionGateway(stdout="hello test")
        use_case = RunScenarioUseCase(execution_gateway=mock_exec)

        scenario = Scenario(
            name="Test Scenario",
            steps=[
                Step(
                    name="Step 1",
                    command="echo hello",
                    assertions=[
                        Assertion(type=AssertionType.CONTAINS, expected="hello", target_field="stdout"),
                    ],
                )
            ],
        )

        result = use_case.execute(scenario)
        self.assertEqual(result.status, StepStatus.PASSED)
        self.assertEqual(len(mock_exec.executed_commands), 1)
        self.assertEqual(result.step_results[0].status, StepStatus.PASSED)

    def test_run_suite_aggregates(self):
        mock_exec = MockExecutionGateway(stdout="hello")
        use_case = RunScenarioUseCase(execution_gateway=mock_exec)
        suite_uc = RunSuiteUseCase(run_scenario_use_case=use_case)

        s1 = Scenario(name="S1", steps=[Step(name="step", command="ok")])
        s2 = Scenario(name="S2", steps=[Step(name="step", command="ok")])

        suite_res = suite_uc.execute([s1, s2], suite_name="Unit Suite")
        self.assertEqual(suite_res.total_scenarios, 2)
        self.assertEqual(suite_res.passed_scenarios, 2)
        self.assertTrue(suite_res.all_passed)
