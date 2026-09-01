"""Unit tests for Bento Domain Rules (Pure Logic)."""
import unittest
from bento.domain.models import Assertion, AssertionType, Scenario, Step, StepStatus
from bento.domain.rules import (
    determine_step_status,
    evaluate_assertion,
    validate_scenario,
)


class TestDomainRules(unittest.TestCase):
    def test_evaluate_assertion_equals(self):
        assertion = Assertion(type=AssertionType.EQUALS, expected="hello", target_field="stdout")
        res = evaluate_assertion(assertion, {"stdout": "hello"})
        self.assertTrue(res.passed)

    def test_evaluate_assertion_contains(self):
        assertion = Assertion(type=AssertionType.CONTAINS, expected="success", target_field="stdout")
        res = evaluate_assertion(assertion, {"stdout": "Build was a success!"})
        self.assertTrue(res.passed)

        res_fail = evaluate_assertion(assertion, {"stdout": "Build failed"})
        self.assertFalse(res_fail.passed)

    def test_evaluate_assertion_matches_regex(self):
        assertion = Assertion(type=AssertionType.MATCHES_REGEX, expected=r"code=\d+", target_field="stdout")
        res = evaluate_assertion(assertion, {"stdout": "Operation finished with code=42"})
        self.assertTrue(res.passed)

    def test_evaluate_assertion_json_key(self):
        assertion = Assertion(type=AssertionType.JSON_KEY_EXISTS, expected="token", target_field="stdout")
        res = evaluate_assertion(assertion, {"stdout": '{"token": "abc-123", "ttl": 300}'})
        self.assertTrue(res.passed)

    def test_validate_scenario_empty_name(self):
        s = Scenario(name="", steps=[Step(name="step1", command="echo ok")])
        errors = validate_scenario(s)
        self.assertGreater(len(errors), 0)
        self.assertIn("non-empty name", errors[0])
