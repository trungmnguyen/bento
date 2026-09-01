"""CLI Entrypoint (Composition Root) for Bento Harness System."""
from __future__ import annotations
import argparse
import sys
from bento.adapters.controllers.cli_controller import CliController
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.frameworks.fs_storage import FileSystemStorageGateway
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
    },
    {
      "name": "Math Calculation Verification",
      "command": "python3 -c "import math; print(f'PI={math.pi:.4f}')"",
      "assertions": [
        {
          "type": "CONTAINS",
          "expected": "PI=3.1416",
          "target_field": "stdout",
          "description": "Math output matches expected pi constant"
        }
      ]
    }
  ]
}
"""


def build_controller() -> CliController:
    storage = FileSystemStorageGateway()
    executor = SubprocessExecutionGateway()
    presenter = ConsolePresenter(use_color=sys.stdout.isatty())
    run_scenario_uc = RunScenarioUseCase(execution_gateway=executor)
    run_suite_uc = RunSuiteUseCase(run_scenario_use_case=run_scenario_uc)

    return CliController(
        run_scenario_use_case=run_scenario_uc,
        run_suite_use_case=run_suite_uc,
        storage_gateway=storage,
        presenter=presenter,
    )


def main(args: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="bento",
        description="🍱 Bento: Clean-Architecture Harness Engineering & Evaluation System",
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

    elif parsed.command == "init":
        storage = FileSystemStorageGateway()
        storage.write_text(parsed.output_path, SAMPLE_SCENARIO_TEMPLATE.strip())
        print(f"🍱 Initialized sample scenario template at: {parsed.output_path}")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
