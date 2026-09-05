"""Unit tests for Bento Adapters (Parsers and Presenters)."""
import json
import unittest
from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.domain.models import AssertionType, ScenarioResult, StepStatus


class TestAdapters(unittest.TestCase):
    def test_scenario_parser_from_json(self):
        json_data = json.dumps({
            "name": "Parsed Scenario",
            "steps": [
                {
                    "name": "Step A",
                    "command": "ls -la",
                    "assertions": [
                        {"type": "CONTAINS", "expected": "total", "target_field": "stdout"}
                    ]
                }
            ]
        })

        scenario = ScenarioParser.from_json(json_data)
        self.assertEqual(scenario.name, "Parsed Scenario")
        self.assertEqual(len(scenario.steps), 1)
        self.assertEqual(scenario.steps[0].assertions[0].type, AssertionType.CONTAINS)

    def test_presenter_formats_cleanly(self):
        presenter = ConsolePresenter(use_color=False)
        res = ScenarioResult(
            scenario_name="Demo",
            status=StepStatus.PASSED,
            step_results=[],
            total_duration_ms=45.0,
        )
        formatted = presenter.format_scenario_result(res)
        self.assertIn("Bento Harness Run: Demo", formatted)
        self.assertIn("[PASS]", formatted)

    def test_cli_controller_emits_traces_on_scenario_and_suite(self):
        from bento.adapters.controllers.cli_controller import CliController
        from bento.domain.models import Scenario, Step, TraceEvent
        from bento.use_cases.run_scenario import RunScenarioUseCase
        from bento.use_cases.run_suite import RunSuiteUseCase

        class DummyStorage:
            def file_exists(self, p): return True
            def read_text(self, p):
                return json.dumps({"name": "Contract A", "steps": [{"name": "s1", "command": "echo 1"}]})
            def list_files(self, d, pattern="*"):
                return ["examples/a.json"]

        class DummyExecutor:
            def execute_command(self, command, cwd=None, env=None, timeout_sec=30.0):
                return 0, "ok", "", 5.0

        class MockTraceGateway:
            def __init__(self):
                self.events: list[TraceEvent] = []
            def append_trace_event(self, event, working_dir=None):
                self.events.append(event)
            def load_recent_traces(self, max_traces=100, working_dir=None):
                return self.events

        storage = DummyStorage()
        executor = DummyExecutor()
        trace_gw = MockTraceGateway()
        scenario_uc = RunScenarioUseCase(execution_gateway=executor)
        suite_uc = RunSuiteUseCase(run_scenario_use_case=scenario_uc)
        presenter = ConsolePresenter(use_color=False)

        controller = CliController(
            run_scenario_use_case=scenario_uc,
            run_suite_use_case=suite_uc,
            storage_gateway=storage,
            presenter=presenter,
            trace_gateway=trace_gw,
        )

        # Run single scenario
        exit_code, _ = controller.handle_run_scenario_file("examples/a.json")
        self.assertEqual(exit_code, 0)
        self.assertEqual(len(trace_gw.events), 1)
        self.assertEqual(trace_gw.events[0].task_name, "Contract A")
        self.assertEqual(trace_gw.events[0].event_type, "scenario_run")

        # Run suite
        exit_code, _ = controller.handle_run_suite_dir("examples")
        self.assertEqual(exit_code, 0)
        self.assertEqual(len(trace_gw.events), 2)
        self.assertEqual(trace_gw.events[1].event_type, "suite_run")
