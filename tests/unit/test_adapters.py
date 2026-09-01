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
