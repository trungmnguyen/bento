"""Unit tests for RunArenaMatchUseCase and Bento Arena Head-to-Head Sparring."""
import json
import unittest

from bento.adapters.controllers.cli_controller import CliController
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.domain.models import (
    ArenaMatchup,
    ArenaScorecard,
    Scenario,
    ScenarioResult,
    Step,
    StepResult,
    StepStatus,
    SuiteResult,
    TraceEvent,
)
from bento.use_cases.arena_match import RunArenaMatchUseCase


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
        return [f for f in self.files.keys() if f.startswith(directory)]


class MockRunScenarioUseCase:
    def __init__(self, results_by_name: dict[str, ScenarioResult] | None = None):
        self.results_by_name = results_by_name or {}

    def execute(self, scenario: Scenario, working_dir_override=None) -> ScenarioResult:
        if scenario.name in self.results_by_name:
            return self.results_by_name[scenario.name]
        # Default passing result
        return ScenarioResult(
            scenario_name=scenario.name,
            status=StepStatus.PASSED,
            step_results=[
                StepResult(
                    step_name="Step 1",
                    command="echo test",
                    status=StepStatus.PASSED,
                    exit_code=0,
                    stdout="test",
                    stderr="",
                    duration_ms=10.0,
                )
            ],
            total_duration_ms=10.0,
        )


class MockTraceGateway:
    def __init__(self):
        self.traces = []

    def append_trace_event(self, event: TraceEvent, working_dir=None) -> None:
        self.traces.append(event)


class TestArenaMatchUseCase(unittest.TestCase):
    def setUp(self):
        self.c_json = json.dumps({
            "name": "Challenger Contract",
            "steps": [{"name": "Step 1", "command": "echo 1"}]
        })
        self.d_json = json.dumps({
            "name": "Defender Contract",
            "steps": [{"name": "Step 1", "command": "echo 2"}]
        })
        self.storage = MockStorageGateway({
            "challenger.json": self.c_json,
            "defender.json": self.d_json,
        })
        self.trace = MockTraceGateway()

    def test_challenger_wins_on_pass_rate(self):
        c_res = ScenarioResult(
            scenario_name="Challenger Contract",
            status=StepStatus.PASSED,
            step_results=[
                StepResult("S1", "cmd", StepStatus.PASSED, 0, "", "", 10.0)
            ],
            total_duration_ms=10.0,
        )
        d_res = ScenarioResult(
            scenario_name="Defender Contract",
            status=StepStatus.FAILED,
            step_results=[
                StepResult("S1", "cmd", StepStatus.FAILED, 1, "", "err", 12.0)
            ],
            total_duration_ms=12.0,
        )
        runner = MockRunScenarioUseCase({
            "Challenger Contract": c_res,
            "Defender Contract": d_res,
        })
        use_case = RunArenaMatchUseCase(self.storage, runner, self.trace)
        scorecard = use_case.execute(ArenaMatchup("challenger.json", "defender.json"))

        self.assertEqual(scorecard.winner, "challenger")
        self.assertEqual(scorecard.challenger_passed, 1)
        self.assertEqual(scorecard.defender_passed, 0)
        self.assertEqual(scorecard.margin, 100.0)
        self.assertEqual(len(self.trace.traces), 1)

    def test_defender_wins_on_duration(self):
        c_res = ScenarioResult(
            scenario_name="Challenger Contract",
            status=StepStatus.PASSED,
            step_results=[
                StepResult("S1", "cmd", StepStatus.PASSED, 0, "", "", 50.0)
            ],
            total_duration_ms=50.0,
        )
        d_res = ScenarioResult(
            scenario_name="Defender Contract",
            status=StepStatus.PASSED,
            step_results=[
                StepResult("S1", "cmd", StepStatus.PASSED, 0, "", "", 20.0)
            ],
            total_duration_ms=20.0,
        )
        runner = MockRunScenarioUseCase({
            "Challenger Contract": c_res,
            "Defender Contract": d_res,
        })
        use_case = RunArenaMatchUseCase(self.storage, runner)
        scorecard = use_case.execute(ArenaMatchup("challenger.json", "defender.json", metric="duration"))

        self.assertEqual(scorecard.winner, "defender")
        self.assertAlmostEqual(scorecard.margin, 30.0)

    def test_missing_contract_raises(self):
        use_case = RunArenaMatchUseCase(self.storage, MockRunScenarioUseCase())
        with self.assertRaises(FileNotFoundError):
            use_case.execute(ArenaMatchup("non_existent.json", "defender.json"))

    def test_presenter_formats_scorecard(self):
        scorecard = ArenaScorecard(
            challenger_name="Candidate v2",
            defender_name="Baseline v1",
            challenger_passed=2,
            challenger_failed=0,
            challenger_total_steps=2,
            challenger_duration_ms=45.0,
            defender_passed=1,
            defender_failed=1,
            defender_total_steps=2,
            defender_duration_ms=60.0,
            winner="challenger",
            metric_used="pass_rate",
            margin=50.0,
        )
        presenter = ConsolePresenter(use_color=False)
        output = presenter.format_arena_scorecard(scorecard)
        self.assertIn("BENTO ARENA: HEAD-TO-HEAD SPARRING", output)
        self.assertIn("CHALLENGER VICTORY", output)
        self.assertIn("Pass Rate", output)
        self.assertIn("Candidate v2", output)

    def test_cli_controller_handle_arena_match(self):
        runner = MockRunScenarioUseCase()
        presenter = ConsolePresenter(use_color=False)
        controller = CliController(
            run_scenario_use_case=runner,
            run_suite_use_case=None,
            storage_gateway=self.storage,
            presenter=presenter,
        )
        code, out = controller.handle_arena_match("challenger.json", "defender.json")
        self.assertEqual(code, 0)
        self.assertIn("BENTO ARENA", out)


if __name__ == "__main__":
    unittest.main()
