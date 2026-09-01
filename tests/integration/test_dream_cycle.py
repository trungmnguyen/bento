"""Integration test for Bento Dream Cycle."""
import unittest
from bento.adapters.controllers.cli_controller import CliController
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.frameworks.fs_memory import FileSystemMemoryGateway
from bento.frameworks.fs_storage import FileSystemStorageGateway
from bento.frameworks.subprocess_executor import SubprocessExecutionGateway
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class TestDreamCycleIntegration(unittest.TestCase):
    def test_dream_cycle_runs_suite_and_summarizes_memory(self):
        storage = FileSystemStorageGateway()
        executor = SubprocessExecutionGateway()
        memory = FileSystemMemoryGateway()
        presenter = ConsolePresenter(use_color=False)

        scenario_uc = RunScenarioUseCase(execution_gateway=executor)
        suite_uc = RunSuiteUseCase(run_scenario_use_case=scenario_uc)

        controller = CliController(
            run_scenario_use_case=scenario_uc,
            run_suite_use_case=suite_uc,
            storage_gateway=storage,
            presenter=presenter,
            memory_gateway=memory,
        )

        exit_code, output = controller.handle_dream_cycle(benchmarks_dir="examples")
        self.assertEqual(exit_code, 0)
        self.assertIn("Bento Dream Cycle Maintenance Completed", output)
        self.assertIn("ALL PASSED", output)
