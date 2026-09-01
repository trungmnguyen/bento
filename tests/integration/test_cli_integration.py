"""Integration test for Bento Harness execution."""
import unittest
from bento.adapters.controllers.cli_controller import CliController
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.frameworks.fs_storage import FileSystemStorageGateway
from bento.frameworks.subprocess_executor import SubprocessExecutionGateway
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class TestCliIntegration(unittest.TestCase):
    def test_integration_run_example(self):
        storage = FileSystemStorageGateway()
        executor = SubprocessExecutionGateway()
        presenter = ConsolePresenter(use_color=False)

        scenario_uc = RunScenarioUseCase(execution_gateway=executor)
        suite_uc = RunSuiteUseCase(run_scenario_use_case=scenario_uc)

        controller = CliController(
            run_scenario_use_case=scenario_uc,
            run_suite_use_case=suite_uc,
            storage_gateway=storage,
            presenter=presenter,
        )

        exit_code, output = controller.handle_run_scenario_file("examples/basic_test.json")
        self.assertEqual(exit_code, 0)
        self.assertIn("[PASS]", output)
        self.assertIn("Python 3 Availability", output)
