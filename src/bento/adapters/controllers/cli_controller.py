"""CliController: Translates CLI requests into Use Case executions and presenter renderings."""
from __future__ import annotations
import datetime
import hashlib
from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.domain.models import (
    MemoryLesson,
    OptimizerCandidate,
    Scenario,
)
from bento.domain.ports import (
    AgentGateway,
    GitGateway,
    MemoryGateway,
    StorageGateway,
    SwarmGateway,
    WorktreeGateway,
)
from bento.use_cases.auto_loop import AutoLoopUseCase
from bento.use_cases.distill_memory import DistillMemoryUseCase
from bento.use_cases.dream_cycle import DreamCycleUseCase
from bento.use_cases.optimize_prompts import OptimizePromptsUseCase
from bento.use_cases.run_arena import RunArenaUseCase
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_suite import RunSuiteUseCase
from bento.use_cases.run_swarm import RunSwarmUseCase


class CliController:
    def __init__(
        self,
        run_scenario_use_case: RunScenarioUseCase,
        run_suite_use_case: RunSuiteUseCase,
        storage_gateway: StorageGateway,
        presenter: ConsolePresenter,
        git_gateway: GitGateway | None = None,
        memory_gateway: MemoryGateway | None = None,
        worktree_gateway: WorktreeGateway | None = None,
    ):
        self._run_scenario = run_scenario_use_case
        self._run_suite = run_suite_use_case
        self._storage = storage_gateway
        self._presenter = presenter
        self._git = git_gateway
        self._memory = memory_gateway
        self._worktree = worktree_gateway

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
            memory_gateway=self._memory,
        )

        result = auto_loop_uc.execute(
            task_description=task_content,
            scenario=scenario,
            max_iterations=max_iterations,
            working_dir=working_dir_override,
            auto_commit=auto_commit,
            auto_distill=True,
        )

        if json_output:
            output = self._presenter.format_json(result)
        else:
            output = self._presenter.format_auto_loop_result(result, verbose=verbose)

        exit_code = 0 if result.succeeded else 1
        return exit_code, output

    def handle_dream_cycle(
        self,
        benchmarks_dir: str = "examples",
        working_dir: str | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        if not self._memory:
            return 1, "Error: Memory gateway not configured."

        dream_uc = DreamCycleUseCase(
            memory_gateway=self._memory,
            storage_gateway=self._storage,
            run_suite_use_case=self._run_suite,
        )

        result = dream_uc.execute(benchmarks_dir=benchmarks_dir, working_dir=working_dir)

        if json_output:
            output = self._presenter.format_json(result)
        else:
            output = self._presenter.format_dream_cycle_result(result)

        exit_code = 0 if result.suite_result.all_passed else 1
        return exit_code, output

    def handle_arena(
        self,
        task_file: str,
        contract_file: str,
        attacker_gateway: AgentGateway,
        builder_gateway: AgentGateway,
        rounds: int = 3,
        working_dir: str | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        if not self._storage.file_exists(task_file) or not self._storage.file_exists(contract_file):
            return 1, "Error: Task or contract file not found."

        task_content = self._storage.read_text(task_file)
        contract_content = self._storage.read_text(contract_file)
        scenario = ScenarioParser.from_json(contract_content)

        arena_uc = RunArenaUseCase(
            attacker_gateway=attacker_gateway,
            builder_gateway=builder_gateway,
            run_scenario_use_case=self._run_scenario,
            memory_gateway=self._memory,
        )

        result = arena_uc.execute(
            task_description=task_content,
            base_scenario=scenario,
            rounds=rounds,
            working_dir=working_dir,
        )

        if json_output:
            output = self._presenter.format_json(result)
        else:
            output = self._presenter.format_arena_result(result)

        exit_code = 0 if result.hardened else 1
        return exit_code, output

    def handle_swarm(
        self,
        task_file: str,
        contract_file: str,
        swarm_gateway: SwarmGateway,
        working_dir: str | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        if not self._storage.file_exists(task_file) or not self._storage.file_exists(contract_file):
            return 1, "Error: Task or contract file not found."

        task_content = self._storage.read_text(task_file)
        contract_content = self._storage.read_text(contract_file)
        scenario = ScenarioParser.from_json(contract_content)

        swarm_uc = RunSwarmUseCase(
            swarm_gateway=swarm_gateway,
            run_scenario_use_case=self._run_scenario,
            storage_gateway=self._storage,
        )

        result = swarm_uc.execute(
            task_description=task_content,
            scenario=scenario,
            working_dir=working_dir,
        )

        if json_output:
            output = self._presenter.format_json(result)
        else:
            output = self._presenter.format_swarm_result(result)

        exit_code = 0 if result.passed else 1
        return exit_code, output

    def handle_optimize(
        self,
        suite_dir: str = "examples",
        candidates: list[OptimizerCandidate] | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        files = self._storage.list_files(suite_dir, pattern="*.json")
        if not files:
            return 1, f"Error: No scenarios found in '{suite_dir}'."

        scenarios = [ScenarioParser.from_json(self._storage.read_text(f)) for f in files]

        default_candidates = candidates or [
            OptimizerCandidate(id="claude-3-7-sonnet", model_name="Claude 3.7 Sonnet", system_prompt_variant="standard"),
            OptimizerCandidate(id="gemini-2-0-flash", model_name="Gemini 2.0 Flash", system_prompt_variant="concise"),
            OptimizerCandidate(id="gemini-2-0-pro", model_name="Gemini 2.0 Pro", system_prompt_variant="deep-reasoning"),
        ]

        opt_uc = OptimizePromptsUseCase(run_suite_use_case=self._run_suite)
        result = opt_uc.execute(candidates=default_candidates, scenarios=scenarios)

        if json_output:
            output = self._presenter.format_json(result)
        else:
            output = self._presenter.format_optimizer_result(result)

        return 0, output

    def handle_memory_list(
        self,
        working_dir: str | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        if not self._memory:
            return 1, "Error: Memory gateway not configured."

        memory = self._memory.load_memory(working_dir=working_dir)
        if json_output:
            output = self._presenter.format_json(memory)
        else:
            output = self._presenter.format_memory_summary(memory)
        return 0, output

    def handle_memory_add(
        self,
        title: str,
        rule: str,
        category: str = "general",
        anti_pattern: str = "",
        tags: list[str] | None = None,
        working_dir: str | None = None,
    ) -> tuple[int, str]:
        if not self._memory:
            return 1, "Error: Memory gateway not configured."

        h = hashlib.sha256(f"{title}_{rule}".encode()).hexdigest()[:8]
        lesson = MemoryLesson(
            id=f"MEM-{h.upper()}",
            title=title,
            category=category,
            context="Manual rule addition via bento memory CLI",
            rule=rule,
            anti_pattern=anti_pattern,
            discovery_date=datetime.datetime.now().strftime("%Y-%m-%d"),
            tags=tags or [category],
        )

        bank = self._memory.load_memory(working_dir=working_dir)
        updated_bank = bank.add_lesson(lesson)
        self._memory.save_memory(updated_bank, working_dir=working_dir)
        return 0, f"🧠 Added rule [{lesson.id}] '{title}' to Bento memory bank."
