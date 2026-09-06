"""CLI Entrypoint (Composition Root) for Bento Harness System."""
from __future__ import annotations
import argparse
import os
import sys
from bento.adapters.controllers.cli_controller import CliController
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.frameworks.agent_drivers import (
    ClaudeCodeDriver,
    GenericCommandDriver,
    MockAgentDriver,
    SwarmDispatcherDriver,
)
from bento.frameworks.fs_memory import FileSystemMemoryGateway
from bento.frameworks.fs_storage import FileSystemStorageGateway
from bento.frameworks.fs_trace import FileSystemTraceGateway
from bento.frameworks.git_driver import SubprocessGitGateway
from bento.frameworks.subprocess_executor import SubprocessExecutionGateway
from bento.frameworks.worktree_driver import SubprocessWorktreeGateway
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_suite import RunSuiteUseCase

SAMPLE_SCENARIO_TEMPLATE = """{
  "name": "Sample Self-Verification Scenario",
  "description": "Demonstrates step execution with ground truth assertions",
  "tags": ["demo", "verification"],
  "steps": [
    {
      "name": "Check Python Version",
      "command": "python3 --version",
      "assertions": [
        {
          "type": "EXIT_CODE_EQUALS",
          "expected": 0,
          "target_field": "exit_code",
          "description": "Exit code must be 0"
        },
        {
          "type": "CONTAINS",
          "expected": "Python 3.",
          "target_field": "stdout",
          "description": "Must run on Python 3"
        }
      ]
    }
  ]
}
"""


def build_controller() -> CliController:
    storage = FileSystemStorageGateway(base_dir=os.getcwd())
    executor = SubprocessExecutionGateway()
    git = SubprocessGitGateway()
    memory = FileSystemMemoryGateway()
    worktree = SubprocessWorktreeGateway()
    trace = FileSystemTraceGateway()
    presenter = ConsolePresenter(use_color=sys.stdout.isatty())
    run_scenario_uc = RunScenarioUseCase(execution_gateway=executor)
    run_suite_uc = RunSuiteUseCase(run_scenario_use_case=run_scenario_uc)

    return CliController(
        run_scenario_use_case=run_scenario_uc,
        run_suite_use_case=run_suite_uc,
        storage_gateway=storage,
        presenter=presenter,
        git_gateway=git,
        memory_gateway=memory,
        worktree_gateway=worktree,
        trace_gateway=trace,
    )


def main(args: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="bento",
        description="🍱 Bento: Clean-Architecture Harness Engineering, Autonomous Loop & Multi-Agent Swarm Arena",
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # bento run <file>
    run_parser = subparsers.add_parser("run", help="Run a single test/eval scenario JSON")
    run_parser.add_argument("scenario_file", help="Path to scenario JSON file")
    run_parser.add_argument("--cwd", default=None, help="Override working directory")
    run_parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    run_parser.add_argument("--json", action="store_true", help="Output raw JSON result")

    # bento suite <dir>
    suite_parser = subparsers.add_parser("suite", help="Run all scenarios in a directory")
    suite_parser.add_argument("suite_dir", help="Directory containing scenario JSON files")
    suite_parser.add_argument("--name", default="Bento Test Suite", help="Suite display name")
    suite_parser.add_argument("--json", action="store_true", help="Output raw JSON result")

    # bento auto
    auto_parser = subparsers.add_parser("auto", help="Run autonomous closed-loop agent iteration with self-learning")
    auto_parser.add_argument("--task", required=True, help="Path to task objective markdown file")
    auto_parser.add_argument("--contract", required=True, help="Path to Bento ground-truth contract JSON")
    auto_parser.add_argument("--max-iterations", type=int, default=5, help="Max self-healing iterations")
    auto_parser.add_argument("--driver", choices=["claude", "generic", "mock"], default="claude", help="Agent driver")
    auto_parser.add_argument("--driver-cmd", default="python3 agent_worker.py", help="Command for generic driver")
    auto_parser.add_argument("--cwd", default=None, help="Override working directory")
    auto_parser.add_argument("--auto-commit", action="store_true", help="Auto-commit git changes on success")
    auto_parser.add_argument("--json", action="store_true", help="Output raw JSON result")
    auto_parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    # bento arena (Level 4: Adversarial Self-Play & Head-to-Head Sparring)
    arena_parser = subparsers.add_parser("arena", help="Run adversarial Red-Team sparring or head-to-head contract match")
    arena_parser.add_argument("--task", default=None, help="Path to task objective markdown file (for agent sparring)")
    arena_parser.add_argument("--contract", default=None, help="Path to base contract JSON (for agent sparring)")
    arena_parser.add_argument("--challenger", default=None, help="Path to challenger contract JSON (for head-to-head)")
    arena_parser.add_argument("--defender", default=None, help="Path to defender contract JSON (for head-to-head)")
    arena_parser.add_argument("--metric", choices=["pass_rate", "duration", "assertions"], default="pass_rate", help="Metric to compare (pass_rate, duration, assertions)")
    arena_parser.add_argument("--rounds", type=int, default=3, help="Number of sparring rounds (default: 3)")
    arena_parser.add_argument("--driver", choices=["claude", "generic", "mock"], default="claude", help="Agent driver")
    arena_parser.add_argument("--cwd", default=None, help="Override working directory")
    arena_parser.add_argument("--json", action="store_true", help="Output raw JSON result")

    # bento swarm (Level 4: Role Pipeline)
    swarm_parser = subparsers.add_parser("swarm", help="Run multi-agent Architect -> Builder -> Auditor -> Judge swarm pipeline")
    swarm_parser.add_argument("--task", required=True, help="Path to task objective markdown file")
    swarm_parser.add_argument("--contract", required=True, help="Path to contract JSON")
    swarm_parser.add_argument("--driver", choices=["claude", "generic", "mock"], default="claude", help="Agent driver")
    swarm_parser.add_argument("--cwd", default=None, help="Override working directory")
    swarm_parser.add_argument("--json", action="store_true", help="Output raw JSON result")

    # bento optimize (Level 4: Benchmark Optimizer)
    opt_parser = subparsers.add_parser("optimize", help="Benchmark and rank model / prompt candidates")
    opt_parser.add_argument("--suite", default="examples", help="Directory containing benchmark scenarios")
    opt_parser.add_argument("--json", action="store_true", help="Output raw JSON result")

    # bento dream
    dream_parser = subparsers.add_parser("dream", help="Run overnight memory consolidation & benchmark sparring")
    dream_parser.add_argument("--benchmarks", default="examples", help="Directory containing benchmarks")
    dream_parser.add_argument("--cwd", default=None, help="Working directory")
    dream_parser.add_argument("--harvest", dest="harvest", action="store_true", default=True, help="Harvest traces from recent runs (default: True)")
    dream_parser.add_argument("--no-harvest", dest="harvest", action="store_false", help="Skip trace harvesting")
    dream_parser.add_argument("--json", action="store_true", help="Output raw JSON")

    # bento memory
    mem_parser = subparsers.add_parser("memory", help="Inspect and manage persistent memory rules")
    mem_sub = mem_parser.add_subparsers(dest="memory_action", help="Memory actions")
    mem_list = mem_sub.add_parser("list", help="List all stored memory rules")
    mem_list.add_argument("--cwd", default=None, help="Working directory")
    mem_list.add_argument("--json", action="store_true", help="Output raw JSON")
    mem_add = mem_sub.add_parser("add", help="Manually add a memory rule")
    mem_add.add_argument("--title", required=True, help="Rule title")
    mem_add.add_argument("--rule", required=True, help="Rule text")
    mem_add.add_argument("--category", default="general", help="Rule category")
    mem_add.add_argument("--anti-pattern", default="", help="Anti-pattern to avoid")
    mem_add.add_argument("--tags", nargs="*", default=[], help="Tags")
    mem_add.add_argument("--cwd", default=None, help="Working directory")


    # bento bg (Butler Background Runner)
    bg_parser = subparsers.add_parser("bg", help="Manage detached background harness tasks (Butler Daemon)")
    bg_sub = bg_parser.add_subparsers(dest="bg_action", help="Background actions")
    
    bg_run = bg_sub.add_parser("run", help="Run a command detached in the background")
    bg_run.add_argument("cmd", help="Command to run in background (e.g. 'bento dream --benchmarks examples')")
    bg_run.add_argument("--tag", default="task", help="Tag/label for this background task")
    bg_run.add_argument("--cwd", default=None, help="Working directory")
    bg_run.add_argument("--json", action="store_true", help="Output raw JSON")

    bg_list = bg_sub.add_parser("list", help="List active and past background tasks")
    bg_list.add_argument("--cwd", default=None, help="Working directory")
    bg_list.add_argument("--json", action="store_true", help="Output raw JSON")

    bg_status = bg_sub.add_parser("status", help="Get status and metadata for a background task")
    bg_status.add_argument("task_id", help="Background task ID (e.g. bg-123456)")
    bg_status.add_argument("--cwd", default=None, help="Working directory")
    bg_status.add_argument("--json", action="store_true", help="Output raw JSON")

    bg_logs = bg_sub.add_parser("logs", help="View logs for a background task")
    bg_logs.add_argument("task_id", help="Background task ID")
    bg_logs.add_argument("-n", "--lines", type=int, default=50, help="Number of log lines to show")
    bg_logs.add_argument("--cwd", default=None, help="Working directory")

    bg_kill = bg_sub.add_parser("kill", help="Terminate a running background task")
    bg_kill.add_argument("task_id", help="Background task ID to kill")
    bg_kill.add_argument("--cwd", default=None, help="Working directory")

    bg_prune = bg_sub.add_parser("prune", help="Sweep kitchen: remove stopped tasks and dead logs")
    bg_prune.add_argument("--all", action="store_true", help="Prune all stopped tasks (default: True)")
    bg_prune.add_argument("--cwd", default=None, help="Working directory")
    bg_prune.add_argument("--json", action="store_true", help="Output raw JSON")

    # bento watch (Ambient File Watcher)
    watch_parser = subparsers.add_parser("watch", help="Continuously watch files and auto-evaluate contract on save")
    watch_parser.add_argument("scenario_file", help="Path to scenario JSON to evaluate on save")
    watch_parser.add_argument("--dir", default=".", help="Directory to watch for file changes")
    watch_parser.add_argument("--cwd", default=None, help="Working directory")

    # bento init <path>
    init_parser = subparsers.add_parser("init", help="Scaffold a sample scenario file")
    init_parser.add_argument("output_path", default="scenario.json", nargs="?", help="Output file path")

    # bento ui (React Web Dashboard)
    ui_parser = subparsers.add_parser("ui", help="Launch the Bento Monitor web dashboard")
    ui_parser.add_argument("--port", type=int, default=8765, help="Port to bind web server (default: 8765)")
    ui_parser.add_argument("--host", default="127.0.0.1", help="Host to bind web server (default: 127.0.0.1)")
    ui_parser.add_argument("--network", action="store_true", help="Bind to 0.0.0.0 for phone/LAN access on same Wi-Fi")
    ui_parser.add_argument("--no-browser", action="store_true", help="Do not automatically open browser")
    ui_parser.add_argument("--no-auth", action="store_true", help="Disable LAN auth token (use carefully on shared networks)")

    # bento monitor (Live ANSI Terminal Watcher)
    monitor_parser = subparsers.add_parser("monitor", help="Launch live interactive terminal telemetry watch")
    monitor_parser.add_argument("--interval", type=float, default=1.0, help="Refresh interval in seconds (default: 1.0)")

    # bento check (Clean Architecture AST Purity Linter)
    check_parser = subparsers.add_parser("check", help="Verify Clean Architecture AST domain purity")
    check_parser.add_argument("--target", default="src/bento/domain", help="Target domain directory to inspect (default: src/bento/domain)")

    # bento completion (Shell Autocompletion)
    completion_parser = subparsers.add_parser("completion", help="Generate shell autocompletion script")
    completion_parser.add_argument("shell", choices=["zsh", "bash", "fish"], default="zsh", nargs="?", help="Shell type (zsh, bash, or fish)")

    # bento new (Bento Origami Interactive Wizard)
    new_parser = subparsers.add_parser("new", help="Scaffold verification contracts interactively (Bento Origami)")
    new_sub = new_parser.add_subparsers(dest="new_action", help="Scaffold targets")
    new_contract = new_sub.add_parser("contract", help="Launch interactive terminal contract wizard")
    new_contract.add_argument("--output", default="benchmarks", help="Output directory for crafted contract (default: benchmarks)")
    new_contract.add_argument("--no-dry-run", action="store_true", help="Skip terminal pre-flight tasting")

    # bento orchestra (Continuous Triad Sprint Orchestration)
    orchestra_parser = subparsers.add_parser("orchestra", help="Orchestrate continuous Triad Sprint (Wasabi 🌶️ + Matcha 🍵 -> Patron 🥢 -> Chef 🍳)")
    orchestra_parser.add_argument("--rounds", type=int, default=1, help="Number of sprint rounds to run (default: 1)")
    orchestra_parser.add_argument("--contract", default=None, help="Target scenario contract JSON to verify")
    orchestra_parser.add_argument("--benchmarks", default="examples", help="Directory of benchmark contracts (default: examples)")
    orchestra_parser.add_argument("--task", default=None, help="Task description or markdown file")
    orchestra_parser.add_argument("--auto-approve", action="store_true", help="Auto-approve patron review gate without interactive block")
    orchestra_parser.add_argument("--finding", dest="findings", action="append", default=None, help="Adversarial finding or vulnerability to record in audit trace")
    orchestra_parser.add_argument("--a11y-finding", dest="a11y_findings", action="append", default=None, help="UI layout or accessibility (A11y) finding to record in audit trace")
    orchestra_parser.add_argument("--cwd", default=None, help="Working directory")
    orchestra_parser.add_argument("--no-dream", dest="dream", action="store_false", default=True, help="Skip automated dream cycle consolidation at sprint conclusion")
    orchestra_parser.add_argument("--json", action="store_true", help="Output raw JSON")

    # bento doctor (Automated System & Hygiene Diagnostics)
    doctor_parser = subparsers.add_parser("doctor", help="Run automated environment, toolchain, and architecture diagnostics")
    doctor_parser.add_argument("--cwd", default=None, help="Working directory")
    doctor_parser.add_argument("--json", action="store_true", help="Output raw JSON diagnostic report")

    # bento export (Shareable Markdown Report Generation)
    export_parser = subparsers.add_parser("export", help="Generate shareable Markdown sprint and system report")
    export_parser.add_argument("--output", "-o", default=None, help="Output file path (prints to stdout if omitted)")
    export_parser.add_argument("--cwd", default=None, help="Working directory")

    parsed = parser.parse_args(args)

    if not parsed.command:
        parser.print_help()
        return 0

    controller = build_controller()

    if parsed.command == "run":
        exit_code, output = controller.handle_run_scenario_file(
            file_path=parsed.scenario_file,
            working_dir_override=parsed.cwd,
            verbose=parsed.verbose,
            json_output=parsed.json,
        )
        print(output)
        return exit_code

    elif parsed.command == "suite":
        exit_code, output = controller.handle_run_suite_dir(
            directory=parsed.suite_dir,
            suite_name=parsed.name,
            json_output=parsed.json,
        )
        print(output)
        return exit_code

    elif parsed.command == "auto":
        driver = ClaudeCodeDriver() if parsed.driver == "claude" else (GenericCommandDriver(command_template=parsed.driver_cmd) if parsed.driver == "generic" else MockAgentDriver())
        exit_code, output = controller.handle_auto_loop(
            task_file=parsed.task,
            contract_file=parsed.contract,
            agent_gateway=driver,
            max_iterations=parsed.max_iterations,
            working_dir_override=parsed.cwd,
            auto_commit=parsed.auto_commit,
            json_output=parsed.json,
            verbose=parsed.verbose,
        )
        print(output)
        return exit_code

    elif parsed.command == "arena":
        if parsed.challenger and parsed.defender:
            exit_code, output = controller.handle_arena_match(
                challenger_file=parsed.challenger,
                defender_file=parsed.defender,
                metric=parsed.metric,
                working_dir=parsed.cwd,
                json_output=parsed.json,
            )
            print(output)
            return exit_code
        elif parsed.task and parsed.contract:
            attacker = ClaudeCodeDriver() if parsed.driver == "claude" else MockAgentDriver()
            builder = ClaudeCodeDriver() if parsed.driver == "claude" else MockAgentDriver()
            exit_code, output = controller.handle_arena(
                task_file=parsed.task,
                contract_file=parsed.contract,
                attacker_gateway=attacker,
                builder_gateway=builder,
                rounds=parsed.rounds,
                working_dir=parsed.cwd,
                json_output=parsed.json,
            )
            print(output)
            return exit_code
        else:
            print("Error: 'bento arena' requires either (--challenger and --defender) for head-to-head or (--task and --contract) for agent sparring.")
            return 1

    elif parsed.command == "swarm":
        if parsed.driver == "claude":
            swarm_driver = SwarmDispatcherDriver(ClaudeCodeDriver())
        elif parsed.driver == "generic":
            swarm_driver = SwarmDispatcherDriver(GenericCommandDriver())
        else:
            swarm_driver = MockAgentDriver()

        exit_code, output = controller.handle_swarm(
            task_file=parsed.task,
            contract_file=parsed.contract,
            swarm_gateway=swarm_driver,
            working_dir=parsed.cwd,
            json_output=parsed.json,
        )
        print(output)
        return exit_code

    elif parsed.command == "optimize":
        exit_code, output = controller.handle_optimize(
            suite_dir=parsed.suite,
            json_output=parsed.json,
        )
        print(output)
        return exit_code

    elif parsed.command == "orchestra":
        exit_code, output = controller.handle_orchestra(
            rounds=parsed.rounds,
            contract_file=parsed.contract,
            benchmarks_dir=parsed.benchmarks,
            task_file=parsed.task,
            auto_approve=parsed.auto_approve,
            working_dir=parsed.cwd,
            json_output=parsed.json,
            adversarial_findings=parsed.findings,
            a11y_findings=parsed.a11y_findings,
            dream=parsed.dream,
        )
        print(output)
        return exit_code

    elif parsed.command == "dream":
        exit_code, output = controller.handle_dream_cycle(
            benchmarks_dir=parsed.benchmarks,
            working_dir=parsed.cwd,
            harvest_traces=parsed.harvest,
            json_output=parsed.json,
        )
        print(output)
        return exit_code

    elif parsed.command == "memory":
        if parsed.memory_action == "add":
            exit_code, output = controller.handle_memory_add(
                title=parsed.title,
                rule=parsed.rule,
                category=parsed.category,
                anti_pattern=parsed.anti_pattern,
                tags=parsed.tags,
                working_dir=parsed.cwd,
            )
            print(output)
            return exit_code
        else:
            exit_code, output = controller.handle_memory_list(
                working_dir=parsed.cwd,
                json_output=getattr(parsed, "json", False),
            )
            print(output)
            return exit_code


    elif parsed.command == "bg":
        if parsed.bg_action == "run":
            exit_code, output = controller.handle_bg_run(
                command=parsed.cmd,
                tag=parsed.tag,
                working_dir=parsed.cwd,
                json_output=parsed.json,
            )
            print(output)
            return exit_code
        elif parsed.bg_action == "list":
            exit_code, output = controller.handle_bg_list(
                working_dir=parsed.cwd,
                json_output=parsed.json,
            )
            print(output)
            return exit_code
        elif parsed.bg_action == "status":
            exit_code, output = controller.handle_bg_status(
                task_id=parsed.task_id,
                working_dir=parsed.cwd,
                json_output=parsed.json,
            )
            print(output)
            return exit_code
        elif parsed.bg_action == "logs":
            exit_code, output = controller.handle_bg_logs(
                task_id=parsed.task_id,
                lines=parsed.lines,
                working_dir=parsed.cwd,
            )
            print(output)
            return exit_code
        elif parsed.bg_action == "kill":
            exit_code, output = controller.handle_bg_kill(
                task_id=parsed.task_id,
                working_dir=parsed.cwd,
            )
            print(output)
            return exit_code
        elif parsed.bg_action == "prune":
            exit_code, output = controller.handle_bg_prune(
                stopped_only=True,
                working_dir=parsed.cwd,
                json_output=parsed.json,
            )
            print(output)
            return exit_code
        else:
            bg_parser.print_help()
            return 0

    elif parsed.command == "watch":
        return controller.handle_watch(
            scenario_file=parsed.scenario_file,
            watch_dir=parsed.dir,
            working_dir=parsed.cwd,
        )

    elif parsed.command == "init":
        storage = FileSystemStorageGateway()
        storage.write_text(parsed.output_path, SAMPLE_SCENARIO_TEMPLATE.strip())
        print(f"🍱 Initialized sample scenario template at: {parsed.output_path}")
        return 0

    elif parsed.command == "ui":
        host = "0.0.0.0" if getattr(parsed, "network", False) else parsed.host
        return controller.handle_start_ui(
            port=parsed.port,
            host=host,
            open_browser=not parsed.no_browser,
            no_auth=getattr(parsed, "no_auth", False),
            block=True,
        )

    elif parsed.command == "monitor":
        return controller.handle_start_monitor(
            refresh_interval=parsed.interval,
        )

    elif parsed.command == "check":
        return controller.handle_check(target_dir=parsed.target)

    elif parsed.command == "completion":
        exit_code, output = controller.handle_completion(shell=parsed.shell)
        print(output)
        return exit_code

    elif parsed.command == "new":
        if parsed.new_action == "contract":
            return controller.handle_new_contract(
                output_dir=parsed.output,
                dry_run=not parsed.no_dry_run,
            )
        new_parser.print_help()
        return 0

    elif parsed.command == "doctor":
        exit_code, output = controller.handle_doctor(
            working_dir=parsed.cwd,
            json_output=parsed.json,
        )
        print(output)
        return exit_code

    elif parsed.command == "export":
        exit_code, output = controller.handle_export(
            output_file=parsed.output,
            working_dir=parsed.cwd,
        )
        print(output)
        return exit_code

    return 0


if __name__ == "__main__":
    sys.exit(main())
