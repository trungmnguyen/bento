"""CliController: Translates CLI requests into Use Case executions and presenter renderings."""
from __future__ import annotations
from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.domain.models import Scenario
from bento.domain.ports import StorageGateway
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class CliController:
    def __init__(
        self,
        run_scenario_use_case: RunScenarioUseCase,
        run_suite_use_case: RunSuiteUseCase,
        storage_gateway: StorageGateway,
        presenter: ConsolePresenter,
    ):
        self._run_scenario = run_scenario_use_case
        self._run_suite = run_suite_use_case
        self._storage = storage_gateway
        self._presenter = presenter

    def handle_run_scenario_file(
        self,
        file_path: str,
        working_dir_override: str | None = None,
        verbose: bool = False,
        json_output: bool = False,
    ) -> tuple[int, str]:
        if not self._storage.file_exists(file_path):
            return 1, f"Error: Scenario file '{file_path}' not found."

        content = self._storage.read_text(file_path)
        scenario = ScenarioParser.from_json(content)
        result = self._run_scenario.execute(scenario, working_dir_override)

        if json_output:
            output = self._presenter.format_json(result)
        else:
            output = self._presenter.format_scenario_result(result, verbose)

        exit_code = 0 if result.passed else 1
        return exit_code, output

    def handle_run_suite_dir(
        self,
        directory: str,
        suite_name: str = "Bento Test Suite",
        json_output: bool = False,
    ) -> tuple[int, str]:
        files = self._storage.list_files(directory, pattern="*.json")
        if not files:
            return 1, f"Error: No JSON scenarios found in directory '{directory}'."

        scenarios: list[Scenario] = []
        for f_path in sorted(files):
            try:
                content = self._storage.read_text(f_path)
                scenarios.append(ScenarioParser.from_json(content))
            except Exception as e:
                return 1, f"Error parsing scenario '{f_path}': {e}"

        result = self._run_suite.execute(scenarios, suite_name=suite_name)

        if json_output:
            output = self._presenter.format_json(result)
        else:
            output = self._presenter.format_suite_result(result)

        exit_code = 0 if result.all_passed else 1
        return exit_code, output
