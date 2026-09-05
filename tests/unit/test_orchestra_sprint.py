"""Unit tests for OrchestraSprintUseCase and Bento Orchestra CLI."""
import json
import unittest

from bento.adapters.controllers.cli_controller import CliController
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.domain.models import (
    MemoryBank,
    MemoryLesson,
    OrchestraSprintResult,
    Scenario,
    ScenarioResult,
    Step,
    StepResult,
    StepStatus,
    SuiteResult,
    TraceEvent,
    TriadRole,
)
from bento.use_cases.orchestra_sprint import OrchestraSprintUseCase


class MockStorageGateway:
    def __init__(self, files: dict[str, str] | None = None):
        self.files = files or {}

    def read_text(self, path: str) -> str:
        return self.files.get(path, "")

    def write_text(self, path: str, content: str) -> None:
        self.files[path] = content

    def file_exists(self, path: str) -> bool:
        return path in self.files

    def list_files(self, directory: str, pattern: str = "*") -> list[str]:
        if pattern == "src/**/*.py":
            return [f for f in self.files.keys() if f.startswith("src/") and f.endswith(".py")]
        return [f for f in self.files.keys() if f.startswith(directory)]


class MockMemoryGateway:
    def __init__(self, lessons: list[MemoryLesson] | None = None):
        self.memory = MemoryBank(lessons=lessons or [])

    def load_memory(self, working_dir=None) -> MemoryBank:
        return self.memory

    def save_memory(self, memory: MemoryBank, working_dir=None) -> None:
        self.memory = memory


class MockTraceGateway:
    def __init__(self):
        self.traces = []

    def append_trace_event(self, event: TraceEvent, working_dir=None) -> None:
        self.traces.append(event)


class MockRunScenarioUseCase:
    def __init__(self, pass_scenario: bool = True):
        self.pass_scenario = pass_scenario

    def execute(self, scenario, working_dir_override=None):
        return ScenarioResult(
            scenario_name=scenario.name,
            status=StepStatus.PASSED if self.pass_scenario else StepStatus.FAILED,
            step_results=[
                StepResult(
                    step_name="test_step",
                    command="echo 1",
                    status=StepStatus.PASSED if self.pass_scenario else StepStatus.FAILED,
                    exit_code=0 if self.pass_scenario else 1,
                    stdout="1" if self.pass_scenario else "",
                    stderr="" if self.pass_scenario else "error",
                    assertion_results=[],
                    duration_ms=10.0,
                    error_message=None if self.pass_scenario else "Step assertion failed",
                )
            ],
            total_duration_ms=10.0,
        )


class MockRunSuiteUseCase:
    def __init__(self, all_passed: bool = True):
        self.all_passed = all_passed

    def execute(self, scenarios, suite_name=""):
        passed_count = len(scenarios) if self.all_passed else max(0, len(scenarios) - 1)
        failed_count = len(scenarios) - passed_count
        return SuiteResult(
            suite_name=suite_name,
            total_scenarios=len(scenarios),
            passed_scenarios=passed_count,
            failed_scenarios=failed_count,
            total_duration_ms=25.0,
            scenario_results=[
                ScenarioResult(
                    scenario_name=s.name,
                    status=StepStatus.PASSED,
                    step_results=[],
                    total_duration_ms=5.0,
                )
                for s in scenarios
            ],
        )


class TestOrchestraSprint(unittest.TestCase):
    def setUp(self):
        self.clean_py_file = "src/bento/domain/pure_math.py"
        self.clean_py_code = '"""Pure math domain."""\ndef add(a: int, b: int) -> int:\n    return a + b\n'
        self.storage = MockStorageGateway(files={self.clean_py_file: self.clean_py_code})
        self.run_scenario = MockRunScenarioUseCase(pass_scenario=True)
        self.run_suite = MockRunSuiteUseCase(all_passed=True)
        self.memory = MockMemoryGateway(
            lessons=[
                MemoryLesson(id="MEM-01", title="Pure Domain", category="architecture", context="c", rule="r")
            ]
        )
        self.trace = MockTraceGateway()

        self.use_case = OrchestraSprintUseCase(
            storage_gateway=self.storage,
            run_scenario_use_case=self.run_scenario,
            run_suite_use_case=self.run_suite,
            memory_gateway=self.memory,
            trace_gateway=self.trace,
        )

    def test_orchestra_sprint_all_passed(self):
        scenario = Scenario(name="smoke_test", steps=[Step(name="s1", command="echo 1")])
        result = self.use_case.execute(rounds=2, target_scenario=scenario)

        self.assertEqual(result.total_rounds, 2)
        self.assertTrue(result.all_passed)
        self.assertEqual(len(result.rounds), 2)
        for r in result.rounds:
            self.assertTrue(r.passed)
            self.assertEqual(len(r.stage_results), 4)
            roles = [s.role for s in r.stage_results]
            self.assertEqual(roles, [TriadRole.WASABI, TriadRole.MATCHA, TriadRole.PATRON, TriadRole.CHEF])

        # Verify traces were recorded
        self.assertEqual(len(self.trace.traces), 2)
        self.assertEqual(self.trace.traces[0].tags, ["orchestra", "triad_sprint"])

    def test_orchestra_wasabi_ast_violation_blocks_patron_gate(self):
        # Inject AST violation in domain layer
        leak_file = "src/bento/domain/leaky.py"
        leak_code = 'import subprocess\ndef leak(): subprocess.run("ls")\n'
        self.storage.files[leak_file] = leak_code

        # Without auto-approve, Patron gate should block
        result = self.use_case.execute(rounds=1, auto_approve=False)
        self.assertFalse(result.all_passed)
        self.assertFalse(result.rounds[0].passed)

        wasabi_stage = result.rounds[0].stage_results[0]
        self.assertEqual(wasabi_stage.role, TriadRole.WASABI)
        self.assertFalse(wasabi_stage.passed)
        self.assertGreater(wasabi_stage.findings_count, 0)

        patron_stage = result.rounds[0].stage_results[2]
        self.assertEqual(patron_stage.role, TriadRole.PATRON)
        self.assertFalse(patron_stage.passed)
        self.assertIn("Blocked", patron_stage.output_summary)

    def test_orchestra_wasabi_ast_violation_with_auto_approve(self):
        # Inject AST violation
        leak_file = "src/bento/domain/leaky.py"
        leak_code = 'import os\ndef leak(): os.system("ls")\n'
        self.storage.files[leak_file] = leak_code

        # With auto-approve, Patron gate overrides
        result = self.use_case.execute(rounds=1, auto_approve=True)
        patron_stage = result.rounds[0].stage_results[2]
        self.assertTrue(patron_stage.passed)
        self.assertIn("Overridden", patron_stage.output_summary)

    def test_cli_controller_handle_orchestra(self):
        presenter = ConsolePresenter(use_color=False)
        controller = CliController(
            run_scenario_use_case=self.run_scenario,
            run_suite_use_case=self.run_suite,
            storage_gateway=self.storage,
            presenter=presenter,
            memory_gateway=self.memory,
            trace_gateway=self.trace,
        )

        exit_code, output = controller.handle_orchestra(rounds=1, auto_approve=True)
        self.assertEqual(exit_code, 0)
        self.assertIn("BENTO ORCHESTRA", output)
        self.assertIn("Wasabi (Red Team)", output)
        self.assertIn("Matcha (Green Team)", output)
        self.assertIn("Patron Gate (User Review)", output)
        self.assertIn("Executive Chef (Blue Team)", output)

    def test_cli_controller_handle_orchestra_json(self):
        presenter = ConsolePresenter(use_color=False)
        controller = CliController(
            run_scenario_use_case=self.run_scenario,
            run_suite_use_case=self.run_suite,
            storage_gateway=self.storage,
            presenter=presenter,
            memory_gateway=self.memory,
            trace_gateway=self.trace,
        )

        exit_code, output = controller.handle_orchestra(rounds=1, auto_approve=True, json_output=True)
        self.assertEqual(exit_code, 0)
        data = json.loads(output)
        self.assertEqual(data["sprint_name"], "Bento Triad Orchestra")
        self.assertEqual(data["total_rounds"], 1)
        self.assertTrue(data["all_passed"])


if __name__ == "__main__":
    unittest.main()
