"""Unit tests for Bento Lifelong Memory & Auto-Distillation."""
import unittest
from bento.domain.models import (
    Assertion,
    AssertionType,
    AutoLoopIteration,
    AutoLoopResult,
    AutoLoopStatus,
    MemoryBank,
    MemoryLesson,
    Scenario,
    ScenarioResult,
    Step,
    StepResult,
    StepStatus,
)
from bento.domain.rules import (
    build_initial_agent_prompt,
    extract_lessons_from_iterations,
    filter_relevant_lessons,
)
from bento.frameworks.agent_drivers import MockAgentDriver
from bento.use_cases.auto_loop import AutoLoopUseCase
from bento.use_cases.distill_memory import DistillMemoryUseCase
from bento.use_cases.run_scenario import RunScenarioUseCase


class MockMemoryGateway:
    def __init__(self, initial_memory: MemoryBank | None = None):
        self.memory = initial_memory or MemoryBank(lessons=[])
        self.saved_regressions = []

    def load_memory(self, working_dir=None) -> MemoryBank:
        return self.memory

    def save_memory(self, memory: MemoryBank, working_dir=None) -> None:
        self.memory = memory

    def save_regression_scenario(self, scenario: Scenario, working_dir=None) -> str:
        self.saved_regressions.append(scenario)
        return f"/mock/{scenario.name}.json"


class TestMemoryRules(unittest.TestCase):
    def test_filter_relevant_lessons_by_tag_and_category(self):
        lesson_quant = MemoryLesson(
            id="MEM-001",
            title="Zero Division RSI Guard",
            category="quant",
            context="RSI",
            rule="Guard flat markets",
            tags=["quant", "indicators"],
        )
        lesson_arch = MemoryLesson(
            id="MEM-002",
            title="Clean Architecture Port Rule",
            category="architecture",
            context="Domain",
            rule="No I/O in domain",
            tags=["architecture"],
        )
        bank = MemoryBank(lessons=[lesson_quant, lesson_arch])

        # Query quant task
        matched = filter_relevant_lessons(bank, tags=["quant"], task_description="Compute EMA and RSI indicators")
        self.assertEqual(len(matched), 1)
        self.assertEqual(matched[0].id, "MEM-001")

    def test_filter_rsi_curriculum_lessons_from_disk(self):
        from bento.frameworks.fs_memory import FileSystemMemoryGateway
        gateway = FileSystemMemoryGateway()
        bank = gateway.load_memory()
        
        # Verify 8 total lessons
        self.assertGreaterEqual(len(bank.lessons), 8)
        
        # Test query for RSI task
        rsi_lessons = filter_relevant_lessons(bank, tags=["rsi"], task_description="Implement RSI crossover indicator")
        lesson_ids = [l.id for l in rsi_lessons]
        self.assertIn("MEM-RSI-RANGE", lesson_ids)
        self.assertIn("MEM-RSI-MDRP", lesson_ids)
        self.assertIn("MEM-RSI-STUDY", lesson_ids)



class TestMemorySelfEvolution(unittest.TestCase):
    def test_auto_loop_distills_and_injects_into_subsequent_tasks(self):
        class StateExecutionGateway:
            def __init__(self):
                self.calls = 0
            def execute_command(self, command, cwd=None, env=None, timeout_sec=30.0):
                self.calls += 1
                if self.calls == 1:
                    return 1, "", "ZeroDivisionError in compute_signal() line 12", 10.0
                return 0, "BUY", "", 10.0

        mock_exec = StateExecutionGateway()
        mock_agent = MockAgentDriver()
        mock_memory = MockMemoryGateway()

        run_scenario_uc = RunScenarioUseCase(execution_gateway=mock_exec)
        auto_loop_uc = AutoLoopUseCase(
            agent_gateway=mock_agent,
            run_scenario_use_case=run_scenario_uc,
            memory_gateway=mock_memory,
        )

        scenario = Scenario(
            name="Quant Signal Strategy",
            tags=["quant", "indicator"],
            steps=[
                Step(
                    name="Calculate Signals",
                    command="python3 signal.py",
                    assertions=[
                        Assertion(type=AssertionType.EXIT_CODE_EQUALS, expected=0, target_field="exit_code"),
                    ],
                )
            ],
        )

        # Run Task 1 -> fails iteration 1, heals on iteration 2
        result1 = auto_loop_uc.execute(
            task_description="Build quant indicator module",
            scenario=scenario,
            max_iterations=5,
        )

        self.assertEqual(result1.status, AutoLoopStatus.SUCCESS)
        self.assertEqual(result1.total_iterations, 2)
        # Verify that memory bank was automatically updated with a distilled rule
        self.assertGreater(len(mock_memory.memory.lessons), 0)
        self.assertEqual(len(mock_memory.saved_regressions), 1)

        # 2. Run Task 2 (Tomorrow's new task)
        # The agent should now have the distilled lesson injected directly into the initial prompt!
        mock_exec.calls = 1  # Reset to pass immediately
        result2 = auto_loop_uc.execute(
            task_description="Build another quant indicator with RSI and MACD",
            scenario=scenario,
            max_iterations=5,
        )

        self.assertEqual(result2.status, AutoLoopStatus.SUCCESS)
        # Check that Prompt #1 of Task 2 received the memory guard
        prompt_task2 = mock_agent.prompts_received[-1]
        self.assertIn("BENTO MEMORY GUARDS", prompt_task2)
        self.assertIn("Calculate Signals", prompt_task2)
