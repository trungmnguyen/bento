"""CliController: Translates CLI requests into Use Case executions and presenter renderings."""
from __future__ import annotations
import datetime
import hashlib
from pathlib import Path
from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.domain.models import (
    ArchitectureReport,
    ArchitectureViolation,
    MemoryLesson,
    OptimizerCandidate,
    Scenario,
    ScenarioResult,
    TraceEvent,
)
from bento.domain.ports import (
    AgentGateway,
    GitGateway,
    MemoryGateway,
    StorageGateway,
    SwarmGateway,
    TraceGateway,
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
from bento.use_cases.validate_architecture import ValidateArchitectureUseCase


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
        trace_gateway: TraceGateway | None = None,
    ):
        self._run_scenario = run_scenario_use_case
        self._run_suite = run_suite_use_case
        self._storage = storage_gateway
        self._presenter = presenter
        self._git = git_gateway
        self._memory = memory_gateway
        self._worktree = worktree_gateway
        self._trace = trace_gateway

    def _record_scenario_trace(
        self,
        scenario: Scenario,
        result: ScenarioResult,
        event_type: str = "scenario_run",
        prompt: str = "",
        working_dir: str | None = None,
    ) -> None:
        if not self._trace:
            return
        failed_msgs = [
            f"{sr.step_name}: {ar.message}"
            for sr in result.step_results
            for ar in sr.assertion_results
            if not ar.passed
        ]
        event = TraceEvent(
            timestamp=datetime.datetime.now().isoformat(),
            task_name=scenario.name,
            iteration=1,
            event_type=event_type,
            prompt_sent=prompt or f"bento run {scenario.name}",
            agent_output=f"Passed: {result.passed}, steps: {len(result.step_results)}",
            exit_code=0 if result.passed else 1,
            passed=result.passed,
            failed_assertions=failed_msgs,
            tags=scenario.tags,
        )
        self._trace.append_trace_event(event, working_dir=working_dir)

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
        self._record_scenario_trace(
            scenario,
            result,
            event_type="scenario_run",
            prompt=f"bento run {file_path}",
            working_dir=working_dir_override,
        )

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
        if self._trace:
            for s, s_res in zip(scenarios, result.scenario_results):
                self._record_scenario_trace(
                    s,
                    s_res,
                    event_type="suite_run",
                    prompt=f"bento suite {directory}",
                )

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
            trace_gateway=self._trace,
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
        harvest_traces: bool = True,
        json_output: bool = False,
    ) -> tuple[int, str]:
        if not self._memory:
            return 1, "Error: Memory gateway not configured."

        dream_uc = DreamCycleUseCase(
            memory_gateway=self._memory,
            storage_gateway=self._storage,
            run_suite_use_case=self._run_suite,
            trace_gateway=self._trace,
        )

        result = dream_uc.execute(
            benchmarks_dir=benchmarks_dir,
            working_dir=working_dir,
            harvest_traces=harvest_traces,
        )

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
            trace_gateway=self._trace,
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

    def handle_arena_match(
        self,
        challenger_file: str,
        defender_file: str,
        metric: str = "pass_rate",
        working_dir: str | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        from bento.domain.models import ArenaMatchup
        from bento.use_cases.arena_match import RunArenaMatchUseCase

        if not self._storage.file_exists(challenger_file):
            return 1, f"Error: Challenger contract file '{challenger_file}' not found."
        if not self._storage.file_exists(defender_file):
            return 1, f"Error: Defender contract file '{defender_file}' not found."

        matchup = ArenaMatchup(
            challenger=challenger_file,
            defender=defender_file,
            metric=metric,
        )
        arena_match_uc = RunArenaMatchUseCase(
            storage_gateway=self._storage,
            run_scenario_use_case=self._run_scenario,
            trace_gateway=self._trace,
        )
        try:
            scorecard = arena_match_uc.execute(matchup, working_dir=working_dir)
        except Exception as e:
            return 1, f"Error executing arena matchup: {e}"

        if json_output:
            output = self._presenter.format_json(scorecard)
        else:
            output = self._presenter.format_arena_scorecard(scorecard)

        return 0, output

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

    def handle_orchestra(
        self,
        rounds: int = 1,
        contract_file: str | None = None,
        benchmarks_dir: str | None = "examples",
        task_file: str | None = None,
        auto_approve: bool = False,
        working_dir: str | None = None,
        json_output: bool = False,
        adversarial_findings: list[str] | None = None,
        a11y_findings: list[str] | None = None,
        dream: bool = True,
    ) -> tuple[int, str]:
        from bento.use_cases.orchestra_sprint import OrchestraSprintUseCase
        from bento.use_cases.dream_cycle import DreamCycleUseCase

        scenario = None
        if contract_file:
            if not self._storage.file_exists(contract_file):
                return 1, f"Error: Contract file '{contract_file}' not found."
            scenario = ScenarioParser.from_json(self._storage.read_text(contract_file))

        task_content = None
        if task_file:
            if self._storage.file_exists(task_file):
                task_content = self._storage.read_text(task_file)
            else:
                task_content = task_file

        dream_uc = None
        if self._memory:
            dream_uc = DreamCycleUseCase(
                memory_gateway=self._memory,
                storage_gateway=self._storage,
                run_suite_use_case=self._run_suite,
                trace_gateway=self._trace,
            )

        orchestra_uc = OrchestraSprintUseCase(
            storage_gateway=self._storage,
            run_scenario_use_case=self._run_scenario,
            run_suite_use_case=self._run_suite,
            memory_gateway=self._memory,
            trace_gateway=self._trace,
            dream_cycle_use_case=dream_uc,
        )

        result = orchestra_uc.execute(
            rounds=rounds,
            target_scenario=scenario,
            benchmarks_dir=benchmarks_dir,
            task_description=task_content,
            auto_approve=auto_approve,
            working_dir=working_dir,
            adversarial_findings=adversarial_findings,
            a11y_findings=a11y_findings,
            dream=dream,
        )

        if json_output:
            output = self._presenter.format_json(result)
        else:
            if hasattr(self._presenter, "format_orchestra_result"):
                output = self._presenter.format_orchestra_result(result)
            else:
                output = self._presenter.format_json(result)

        exit_code = 0 if result.all_passed else 1
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

    def handle_bg_run(
        self,
        command: str,
        tag: str = "task",
        working_dir: str | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        from bento.frameworks.bg_runner import BackgroundTaskRunner
        runner = BackgroundTaskRunner()
        task_info = runner.start_task(command=command, tag=tag, working_dir=working_dir)

        if json_output:
            return 0, self._presenter.format_json(task_info)

        out = (
            f"🎩 Bento Background Task Spawned Successfully!\n"
            f"  ID: {task_info['id']} | Tag: {task_info['tag']} | PID: {task_info['pid']}\n"
            f"  Log: {task_info['log_file']}\n"
            f"  To view logs: bento bg logs {task_info['id']}\n"
            f"  To check status: bento bg status {task_info['id']}"
        )
        return 0, out

    def handle_bg_list(
        self,
        working_dir: str | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        from bento.frameworks.bg_runner import BackgroundTaskRunner
        runner = BackgroundTaskRunner()
        tasks = runner.list_tasks(working_dir=working_dir)

        if json_output:
            return 0, self._presenter.format_json(tasks)
        return 0, self._presenter.format_bg_tasks(tasks)

    def handle_bg_status(
        self,
        task_id: str,
        working_dir: str | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        from bento.frameworks.bg_runner import BackgroundTaskRunner
        runner = BackgroundTaskRunner()
        info = runner.get_status(task_id, working_dir=working_dir)
        if not info:
            return 1, f"Error: Task '{task_id}' not found."

        if json_output:
            return 0, self._presenter.format_json(info)
        return 0, self._presenter.format_bg_status(info)

    def handle_bg_logs(
        self,
        task_id: str,
        lines: int = 50,
        working_dir: str | None = None,
    ) -> tuple[int, str]:
        from bento.frameworks.bg_runner import BackgroundTaskRunner
        runner = BackgroundTaskRunner()
        logs = runner.get_logs(task_id, lines=lines, working_dir=working_dir)
        return 0, logs

    def handle_bg_kill(
        self,
        task_id: str,
        working_dir: str | None = None,
    ) -> tuple[int, str]:
        from bento.frameworks.bg_runner import BackgroundTaskRunner
        runner = BackgroundTaskRunner()
        killed = runner.kill_task(task_id, working_dir=working_dir)
        if killed:
            return 0, f"🎩 Successfully terminated background task '{task_id}'."
        return 1, f"Error: Could not terminate task '{task_id}'."

    def handle_bg_prune(
        self,
        stopped_only: bool = True,
        working_dir: str | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        from bento.frameworks.bg_runner import BackgroundTaskRunner
        runner = BackgroundTaskRunner()
        count = runner.prune_tasks(stopped_only=stopped_only, working_dir=working_dir)
        if json_output:
            return 0, self._presenter.format_json({"pruned_tasks_count": count})
        return 0, f"🧹 Swept kitchen: Pruned {count} stopped background task(s) and associated logs."

    def handle_watch(
        self,
        scenario_file: str,
        watch_dir: str = ".",
        working_dir: str | None = None,
        max_cycles: int | None = None,
    ) -> int:
        from bento.frameworks.watcher import AmbientWatcher
        print(f"🎩 Bento Ambient Watcher Active...")
        print(f"👀 Watching '{watch_dir}' -> Auto-evaluating contract '{scenario_file}' on save")
        print("─" * 65)

        # Initial run
        self.handle_run_scenario_file(scenario_file, working_dir_override=working_dir)

        watcher = AmbientWatcher(watch_dir=watch_dir)

        def on_change(files: list[str]) -> None:
            names = [Path(f).name for f in files[:3]]
            print(f"\n⚡ Changes detected in: {', '.join(names)} -> Re-evaluating contract...")
            exit_code, output = self.handle_run_scenario_file(scenario_file, working_dir_override=working_dir)
            print(output)

        watcher.run_watch_loop(on_change_callback=on_change, max_cycles=max_cycles)
        return 0

    def handle_start_ui(
        self,
        port: int = 8765,
        host: str = "127.0.0.1",
        open_browser: bool = True,
        no_auth: bool = False,
        block: bool = True,
    ) -> int:
        import secrets
        import webbrowser
        from bento.frameworks.bg_runner import BackgroundTaskRunner
        from bento.frameworks.web_server import BentoWebServer
        from bento.use_cases.dream_cycle import DreamCycleUseCase

        bg_runner = BackgroundTaskRunner()
        dream_uc = DreamCycleUseCase(
            memory_gateway=self._memory,
            storage_gateway=self._storage,
            run_suite_use_case=self._run_suite,
            trace_gateway=self._trace,
        )

        # Auto-generate a random access token when serving over LAN (0.0.0.0).
        # Loopback requests (127.0.0.1/::1) are always exempt on the server side,
        # so localhost-only usage requires no token.
        auth_token: str | None = None
        if host in ("0.0.0.0", "") and not no_auth:
            auth_token = secrets.token_urlsafe(24)

        server = BentoWebServer(
            bg_runner=bg_runner,
            memory_gateway=self._memory,
            storage_gateway=self._storage,
            run_suite_uc=self._run_suite,
            dream_uc=dream_uc,
            trace_gateway=self._trace,
            execution_gateway=getattr(self._run_scenario, "_execution_gateway", None),
            host=host,
            port=port,
            auth_token=auth_token,
        )

        if open_browser:
            browser_host = "127.0.0.1" if host in ("0.0.0.0", "") else host
            browser_url = f"http://{browser_host}:{port}"
            if auth_token:
                browser_url += f"?token={auth_token}"
            webbrowser.open(browser_url)

        server.start(block=block)
        return 0

    def handle_start_monitor(
        self,
        refresh_interval: float = 1.0,
        max_cycles: int | None = None,
    ) -> int:
        from bento.frameworks.bg_runner import BackgroundTaskRunner
        from bento.frameworks.terminal_monitor import TerminalMonitor
        from bento.use_cases.dream_cycle import DreamCycleUseCase

        bg_runner = BackgroundTaskRunner()
        dream_uc = DreamCycleUseCase(
            memory_gateway=self._memory,
            storage_gateway=self._storage,
            run_suite_use_case=self._run_suite,
            trace_gateway=self._trace,
        )

        monitor = TerminalMonitor(
            bg_runner=bg_runner,
            memory_gateway=self._memory,
            storage_gateway=self._storage,
            run_suite_uc=self._run_suite,
            dream_uc=dream_uc,
            trace_gateway=self._trace,
            refresh_interval=refresh_interval,
        )

        monitor.run_loop(max_cycles=max_cycles)
        return 0

    def handle_check(self, target_dir: str = "src/bento/domain") -> int:
        validator = ValidateArchitectureUseCase(self._storage)
        report = validator.execute(target_dir=target_dir)

        print(f"\n🍱 BENTO CLEAN ARCHITECTURE AST CHECK: {target_dir}")
        print("─" * 65)
        print(f"📁 Files Inspected: {report.files_checked}")

        if report.passed:
            print("✨ 100% PURE DOMAIN VERIFIED: Zero I/O, zero external dependencies. 🍵")
            print("─" * 65)
            return 0
        else:
            print(f"❌ VIOLATIONS FOUND: {len(report.violations)} Clean Architecture violations detected!")
            for v in report.violations:
                print(f"  • {v.file_path}:{v.line_number} [{v.rule}] {v.message}")
            print("─" * 65)
            return 1

    def handle_completion(self, shell: str = "zsh") -> int:
        subcommands = [
            "run", "suite", "auto", "watch", "arena", "dream", "eval",
            "optimize", "swarm", "memory", "bg", "ui", "monitor", "check", "orchestra", "doctor", "completion",
        ]
        if shell == "zsh":
            script = """#compdef bento
_bento() {
    local -a commands
    commands=(
        'run:Execute a single deterministic scenario contract'
        'suite:Execute a directory of benchmark contracts'
        'auto:Run closed-loop agentic self-healing'
        'watch:Watch files and auto-evaluate contract on change'
        'arena:Run adversarial Red-Team sparring or head-to-head match'
        'dream:Execute overnight trace harvesting & memory synthesis'
        'eval:Direct assertion evaluation against output'
        'optimize:Hill-climbing prompt optimization'
        'swarm:Run multi-agent verification swarm'
        'memory:Manage persistent institutional memory bank'
        'bg:Manage background Butler daemons'
        'ui:Launch interactive Web UI dashboard'
        'monitor:Launch real-time telemetry TUI monitor'
        'check:Verify Clean Architecture AST domain purity'
        'orchestra:Run continuous Triad Sprint review loop'
        'doctor:Run automated environment, toolchain, and architecture diagnostics'
        'completion:Generate shell autocompletion script'
    )
    _describe -t commands 'bento command' commands
}
_bento "$@"
"""
        else:
            joined_cmds = " ".join(subcommands)
            script = f"""# bash completion for bento
_bento_completions() {{
    local cur="${{COMP_WORDS[COMP_CWORD]}}"
    local commands="{joined_cmds}"
    COMPREPLY=( $(compgen -W "${{commands}}" -- "${{cur}}") )
}}
complete -F _bento_completions bento
"""
        print(script.strip())
        return 0

    def handle_new_contract(self, output_dir: str = "benchmarks", dry_run: bool = True) -> int:
        from bento.frameworks.interactive_wizard import InteractiveContractWizard
        exec_gw = getattr(self._run_scenario, "_execution_gateway", None)
        if not exec_gw:
            self._presenter.display_error("Execution gateway unavailable for contract dry-run.")
            return 1
        wizard = InteractiveContractWizard(execution_gateway=exec_gw, storage_gateway=self._storage)
        return wizard.run_interactive(output_dir=output_dir, dry_run=dry_run)

    def handle_doctor(
        self,
        working_dir: str | None = None,
        json_output: bool = False,
    ) -> tuple[int, str]:
        import shutil
        import socket
        import sys
        from bento.use_cases.doctor_diagnostics import DoctorDiagnosticsUseCase

        py_ver = sys.version_info[:3]
        py_str = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

        node_path = shutil.which("node")
        node_version = None
        if node_path:
            try:
                import subprocess
                res = subprocess.run(["node", "-v"], capture_output=True, text=True, timeout=2.0)
                node_version = res.stdout.strip()
            except Exception:
                node_version = "detected"

        port_8765_available = True
        daemon_running = False
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.5)
            err = s.connect_ex(("127.0.0.1", 8765))
            s.close()
            if err == 0:
                port_8765_available = False
                import urllib.request
                try:
                    req = urllib.request.urlopen("http://127.0.0.1:8765/api/status", timeout=1.0)
                    if req.status == 200:
                        daemon_running = True
                except Exception:
                    pass
        except Exception:
            pass

        system_info = {
            "python_version": py_ver,
            "python_version_str": py_str,
            "node_version": node_version,
            "port_8765_available": port_8765_available,
            "daemon_running": daemon_running,
        }

        use_case = DoctorDiagnosticsUseCase(
            storage_gateway=self._storage,
            memory_gateway=self._memory,
        )
        report = use_case.execute(system_info=system_info, working_dir=working_dir)

        if json_output:
            output = self._presenter.format_json(report)
        else:
            output = self._presenter.format_doctor_report(report)

        exit_code = 0 if report.all_passed else 1
        return exit_code, output

    def handle_export(
        self,
        output_file: str | None = None,
        working_dir: str | None = None,
    ) -> tuple[int, str]:
        import shutil
        import sys
        from bento.use_cases.export_report import ExportReportUseCase

        py_ver = sys.version_info[:3]
        py_str = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        node_path = shutil.which("node")
        node_version = "detected" if node_path else None

        system_info = {
            "python_version": py_ver,
            "python_version_str": py_str,
            "node_version": node_version,
            "port_8765_available": True,
        }

        use_case = ExportReportUseCase(
            storage_gateway=self._storage,
            memory_gateway=self._memory,
            trace_gateway=self._trace,
        )
        try:
            report_md = use_case.execute(
                output_file=output_file,
                system_info=system_info,
                working_dir=working_dir,
            )
        except PermissionError as pe:
            return 1, f"❌ Export failed: {pe}"

        if output_file:
            msg = f"✨ Report exported successfully to {output_file}"
        else:
            msg = report_md

        return 0, msg

    def handle_completion(self, shell: str) -> tuple[int, str]:
        from bento.use_cases.completion import GenerateCompletionUseCase
        try:
            script = GenerateCompletionUseCase().execute(shell)
            return 0, script
        except ValueError as e:
            return 1, f"Error: {e}"



