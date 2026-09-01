"""CliController: Translates CLI requests into Use Case executions and presenter renderings."""
from __future__ import annotations
from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.domain.models import Scenario
from bento.domain.ports import AgentGateway, GitGateway, StorageGateway
from bento.use_cases.auto_loop import AutoLoopUseCase
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class CliController:
    def __init__(
        self,
        run_scenario_use_case: RunScenarioUseCase,
        run_suite_use_case: RunSuiteUseCase,
        storage_gateway: StorageGateway,
        presenter: ConsolePresenter,
        git_gateway: GitGateway | None = None,
    ):
        self._run_scenario = run_scenario_use_case
        self._run_suite = run_suite_use_case
        self._storage = storage_gateway
        self._presenter = presenter
        self._git = git_gateway

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

    def handle_auto_loop(
        self,
        task_file: str,
        contract_file: str,
        agent_gateway: AgentGateway,
        max_iterations: int = 5,
        working_dir_override: str | None = None,
        auto_commit: bool = False,
        json_output: bool = False,
        verbose: bool = False,
    ) -> tuple[int, str]:
        if not self._storage.file_exists(task_file):
            return 1, f"Error: Task file '{task_file}' not found."
        if not self._storage.file_exists(contract_file):
            return 1, f"Error: Contract file '{contract_file}' not found."

        task_content = self._storage.read_text(task_file)
        contract_content = self._storage.read_text(contract_file)
        scenario = ScenarioParser.from_json(contract_content)

        auto_loop_uc = AutoLoopUseCase(
            agent_gateway=agent_gateway,
            run_scenario_use_case=self._run_scenario,
            git_gateway=self._git,
        )

        result = auto_loop_uc.execute(
            task_description=task_content,
            scenario=scenario,
            max_iterations=max_iterations,
            working_dir=working_dir_override,
            auto_commit=auto_commit,
        )

        if json_output:
            output = self._presenter.format_json(result)
        else:
            output = self._presenter.format_auto_loop_result(result, verbose=verbose)

        exit_code = 0 if result.succeeded else 1
        return exit_code, output
