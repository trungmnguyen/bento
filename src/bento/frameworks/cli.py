"""CLI Entrypoint (Composition Root) for Bento Harness System."""
from __future__ import annotations
import argparse
import sys
from bento.adapters.controllers.cli_controller import CliController
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.frameworks.agent_drivers import (
    ClaudeCodeDriver,
    GenericCommandDriver,
    MockAgentDriver,
)
from bento.frameworks.fs_memory import FileSystemMemoryGateway
from bento.frameworks.fs_storage import FileSystemStorageGateway
from bento.frameworks.git_driver import SubprocessGitGateway
from bento.frameworks.subprocess_executor import SubprocessExecutionGateway
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
    storage = FileSystemStorageGateway()
    executor = SubprocessExecutionGateway()
    git = SubprocessGitGateway()
    memory = FileSystemMemoryGateway()
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
    )


def main(args: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="bento",
        description="🍱 Bento: Clean-Architecture Harness Engineering, Autonomous Loop & Self-Learning Memory System",
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

    # bento auto --task <task.md> --contract <scenario.json>
    auto_parser = subparsers.add_parser("auto", help="Run autonomous closed-loop agent iteration with self-learning")
    auto_parser.add_argument("--task", required=True, help="Path to task objective markdown file")
    auto_parser.add_argument("--contract", required=True, help="Path to Bento ground-truth contract JSON")
    auto_parser.add_argument("--max-iterations", type=int, default=5, help="Max self-healing iterations (default: 5)")
    auto_parser.add_argument("--driver", choices=["claude", "generic", "mock"], default="claude", help="Agent driver")
    auto_parser.add_argument("--driver-cmd", default="python3 agent_worker.py", help="Command for generic driver")
    auto_parser.add_argument("--cwd", default=None, help="Override working directory")
    auto_parser.add_argument("--auto-commit", action="store_true", help="Auto-commit git changes on success")
    auto_parser.add_argument("--json", action="store_true", help="Output raw JSON result")
    auto_parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")

    # bento dream
    dream_parser = subparsers.add_parser("dream", help="Run overnight memory consolidation & benchmark sparring")
    dream_parser.add_argument("--benchmarks", default="examples", help="Directory containing benchmarks")
    dream_parser.add_argument("--cwd", default=None, help="Working directory")
    dream_parser.add_argument("--json", action="store_true", help="Output raw JSON")

    # bento memory
    mem_parser = subparsers.add_parser("memory", help="Inspect and manage persistent memory rules")
    mem_sub = mem_parser.add_subparsers(dest="memory_action", help="Memory actions")

    # bento memory list
    mem_list = mem_sub.add_parser("list", help="List all stored memory rules")
    mem_list.add_argument("--cwd", default=None, help="Working directory")
    mem_list.add_argument("--json", action="store_true", help="Output raw JSON")

    # bento memory add
    mem_add = mem_sub.add_parser("add", help="Manually add a memory rule")
    mem_add.add_argument("--title", required=True, help="Rule title")
    mem_add.add_argument("--rule", required=True, help="Rule text")
    mem_add.add_argument("--category", default="general", help="Rule category")
    mem_add.add_argument("--anti-pattern", default="", help="Anti-pattern to avoid")
    mem_add.add_argument("--tags", nargs="*", default=[], help="Tags")
    mem_add.add_argument("--cwd", default=None, help="Working directory")

    # bento init <path>
    init_parser = subparsers.add_parser("init", help="Scaffold a sample scenario file")
    init_parser.add_argument("output_path", default="scenario.json", nargs="?", help="Output file path")

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
        if parsed.driver == "claude":
            driver = ClaudeCodeDriver()
        elif parsed.driver == "generic":
            driver = GenericCommandDriver(command_template=parsed.driver_cmd)
        else:
            driver = MockAgentDriver()

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

    elif parsed.command == "dream":
        exit_code, output = controller.handle_dream_cycle(
            benchmarks_dir=parsed.benchmarks,
            working_dir=parsed.cwd,
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
            # Default to list
            exit_code, output = controller.handle_memory_list(
                working_dir=parsed.cwd,
                json_output=getattr(parsed, "json", False),
            )
            print(output)
            return exit_code

    elif parsed.command == "init":
        storage = FileSystemStorageGateway()
        storage.write_text(parsed.output_path, SAMPLE_SCENARIO_TEMPLATE.strip())
        print(f"🍱 Initialized sample scenario template at: {parsed.output_path}")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
