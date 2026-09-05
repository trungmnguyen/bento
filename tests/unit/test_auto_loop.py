"""Unit tests for Bento AutoLoop Use Case & Domain Rules."""
import unittest
from bento.domain.models import (
    AgentResponse,
    Assertion,
    AssertionType,
    AutoLoopStatus,
    Scenario,
    Step,
    StepStatus,
)
from bento.domain.rules import (
    build_corrective_agent_prompt,
    build_initial_agent_prompt,
)
from bento.frameworks.agent_drivers import MockAgentDriver
from bento.use_cases.auto_loop import AutoLoopUseCase
from bento.use_cases.run_scenario import RunScenarioUseCase


class MockExecutionGatewayWithState:
    """Simulates code state that fails on attempt 1 and passes on attempt 2."""
    def __init__(self):
        self.call_count = 0

    def execute_command(self, command: str, cwd=None, env=None, timeout_sec=30.0):
        self.call_count += 1
        if self.call_count == 1:
            # First attempt fails
            return 1, "", "ZeroDivisionError in line 10", 15.0
        else:
            # Second attempt passes
            return 0, '{"signal": "HOLD", "status": "ok"}', "", 10.0


class MockGitGateway:
    def __init__(self):
        self.committed_messages = []

    def commit_changes(self, message: str, working_dir=None) -> bool:
        self.committed_messages.append(message)
        return True


class TestAutoLoop(unittest.TestCase):
    def test_auto_loop_self_corrects_on_iteration_2(self):
        mock_exec = MockExecutionGatewayWithState()
        mock_agent = MockAgentDriver()
        mock_git = MockGitGateway()

        run_scenario_uc = RunScenarioUseCase(execution_gateway=mock_exec)
        auto_loop_uc = AutoLoopUseCase(
            agent_gateway=mock_agent,
            run_scenario_use_case=run_scenario_uc,
            git_gateway=mock_git,
        )

        scenario = Scenario(
            name="Self-Healing Indicator",
            steps=[
                Step(
                    name="Run Calculation",
                    command="python3 indicator.py",
                    assertions=[
                        Assertion(type=AssertionType.EXIT_CODE_EQUALS, expected=0, target_field="exit_code"),
                        Assertion(type=AssertionType.CONTAINS, expected="HOLD", target_field="stdout"),
                    ],
                )
            ],
        )

        result = auto_loop_uc.execute(
            task_description="Implement indicator.py with safe zero-division handling",
            scenario=scenario,
            max_iterations=5,
            auto_commit=True,
        )

        self.assertEqual(result.status, AutoLoopStatus.SUCCESS)
        self.assertEqual(result.total_iterations, 2)
        self.assertEqual(len(mock_agent.prompts_received), 2)
        # Check that prompt #2 received the error trace
        self.assertIn("ZeroDivisionError", mock_agent.prompts_received[1])
        # Check git auto-commit
        self.assertEqual(len(mock_git.committed_messages), 1)

    def test_auto_loop_budget_exhausted(self):
        class AlwaysFailExecutionGateway:
            def execute_command(self, command, cwd=None, env=None, timeout_sec=30.0):
                return 1, "", "Permanent failure", 10.0

        mock_exec = AlwaysFailExecutionGateway()
        mock_agent = MockAgentDriver()
        run_scenario_uc = RunScenarioUseCase(execution_gateway=mock_exec)
        auto_loop_uc = AutoLoopUseCase(
            agent_gateway=mock_agent,
            run_scenario_use_case=run_scenario_uc,
        )

        scenario = Scenario(
            name="Unsolvable Scenario",
            steps=[Step(name="Step 1", command="exit 1")],
        )

        result = auto_loop_uc.execute(
            task_description="Task",
            scenario=scenario,
            max_iterations=3,
        )

        self.assertEqual(result.status, AutoLoopStatus.BUDGET_EXHAUSTED)
        self.assertEqual(result.total_iterations, 3)
        self.assertFalse(result.succeeded)

    def test_auto_loop_with_trace_gateway_records_failed_assertions(self):
        class RecordingTraceGateway:
            def __init__(self):
                self.events = []
            def append_trace_event(self, event, working_dir=None):
                self.events.append(event)

        trace_gw = RecordingTraceGateway()
        mock_exec = MockExecutionGatewayWithState()
        mock_agent = MockAgentDriver()
        run_scenario_uc = RunScenarioUseCase(execution_gateway=mock_exec)

        auto_loop_uc = AutoLoopUseCase(
            agent_gateway=mock_agent,
            run_scenario_use_case=run_scenario_uc,
            trace_gateway=trace_gw,
        )

        scenario = Scenario(
            name="Indicator With Trace",
            steps=[
                Step(
                    name="Calculate RSI",
                    command="python3 calc.py",
                    assertions=[
                        Assertion(type=AssertionType.CONTAINS, expected="ok", target_field="stdout"),
                    ],
                )
            ],
        )

        result = auto_loop_uc.execute(
            task_description="Fix calc.py",
            scenario=scenario,
            max_iterations=2,
        )

        self.assertTrue(result.succeeded)
        self.assertEqual(len(trace_gw.events), 2)
        # First event had failed assertions
        self.assertFalse(trace_gw.events[0].passed)
        self.assertGreater(len(trace_gw.events[0].failed_assertions), 0)
        # Second event passed
        self.assertTrue(trace_gw.events[1].passed)



class TestPromptSynthesisRules(unittest.TestCase):
    def test_build_initial_prompt(self):
        scenario = Scenario(
            name="Test Contract",
            steps=[
                Step(
                    name="Build step",
                    command="python3 build.py",
                    assertions=[
                        Assertion(type=AssertionType.CONTAINS, expected="SUCCESS", target_field="stdout"),
                    ],
                )
            ],
        )
        prompt = build_initial_agent_prompt("Write build.py", scenario)
        self.assertIn("TASK OBJECTIVE:", prompt)
        self.assertIn("Write build.py", prompt)
        self.assertIn("Build step", prompt)
        self.assertIn("SUCCESS", prompt)
