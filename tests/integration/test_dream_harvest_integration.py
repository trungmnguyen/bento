"""Integration test for Level 5: Autonomous Dreaming & Trace Harvesting."""
import tempfile
import unittest
from pathlib import Path
from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.domain.models import TraceEvent, MemoryBank, MemoryLesson, Scenario, Step, Assertion, AssertionType
from bento.frameworks.fs_memory import FileSystemMemoryGateway
from bento.frameworks.fs_storage import FileSystemStorageGateway
from bento.frameworks.fs_trace import FileSystemTraceGateway
from bento.use_cases.dream_cycle import DreamCycleUseCase
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class MockExecutionGateway:
    def execute_command(self, command, cwd=None, env=None, timeout_sec=30.0):
        return 0, "All assertions green", "", 10.0


class TestDreamHarvestIntegration(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.base_path = Path(self.tmp_dir.name)
        self.benchmarks_dir = self.base_path / "benchmarks"
        self.benchmarks_dir.mkdir()

        # Create a sample benchmark scenario
        scenario = Scenario(
            name="Sample Verification",
            description="Checks health",
            steps=[
                Step(
                    name="Run Command",
                    command="echo test",
                    assertions=[
                        Assertion(
                            type=AssertionType.EQUALS,
                            expected=0,
                            target_field="exit_code",
                        )
                    ],
                )
            ],
        )
        (self.benchmarks_dir / "sample.json").write_text(ScenarioParser.to_json(scenario))

    def tearDown(self):
        self.tmp_dir.cleanup()

    def test_dream_harvests_recent_traces_and_updates_memory(self):
        trace_gateway = FileSystemTraceGateway(base_dir=str(self.base_path))
        memory_gateway = FileSystemMemoryGateway(base_dir=str(self.base_path))
        storage_gateway = FileSystemStorageGateway()
        exec_gateway = MockExecutionGateway()

        run_scenario_uc = RunScenarioUseCase(execution_gateway=exec_gateway)
        run_suite_uc = RunSuiteUseCase(run_scenario_use_case=run_scenario_uc)

        # 1. Simulate recent daytime execution trace with failure followed by repair
        trace_gateway.append_trace_event(
            TraceEvent(
                timestamp="2026-09-03T14:00:00",
                task_name="Quant Strategy Backtest",
                iteration=1,
                event_type="iteration",
                passed=False,
                failed_assertions=["Expected Sharpe > 1.5, got 0.8"],
                tags=["quant", "sharpe"],
            ),
            working_dir=str(self.base_path),
        )
        trace_gateway.append_trace_event(
            TraceEvent(
                timestamp="2026-09-03T14:05:00",
                task_name="Quant Strategy Backtest",
                iteration=2,
                event_type="iteration",
                passed=True,
                failed_assertions=[],
                tags=["quant", "sharpe"],
            ),
            working_dir=str(self.base_path),
        )

        # 2. Run Dream Cycle with harvesting enabled
        dream_uc = DreamCycleUseCase(
            memory_gateway=memory_gateway,
            storage_gateway=storage_gateway,
            run_suite_use_case=run_suite_uc,
            trace_gateway=trace_gateway,
        )

        result = dream_uc.execute(
            benchmarks_dir=str(self.benchmarks_dir),
            working_dir=str(self.base_path),
            harvest_traces=True,
        )

        # 3. Assertions
        self.assertEqual(result.new_lessons_discovered, 1)
        self.assertEqual(len(result.harvested_lessons), 1)
        self.assertTrue(result.suite_result.all_passed)

        # Verify persisted into memory bank on disk
        loaded_bank = memory_gateway.load_memory(working_dir=str(self.base_path))
        lesson_ids = [l.id for l in loaded_bank.lessons]
        self.assertIn(result.harvested_lessons[0].id, lesson_ids)


if __name__ == "__main__":
    unittest.main()
