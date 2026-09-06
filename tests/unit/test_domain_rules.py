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

    def test_evaluate_assertion_less_than(self):
        assertion = Assertion(type=AssertionType.LESS_THAN, expected="100.5", target_field="stdout")
        res = evaluate_assertion(assertion, {"stdout": "42.0"})
        self.assertTrue(res.passed)
        res_fail = evaluate_assertion(assertion, {"stdout": "150.0"})
        self.assertFalse(res_fail.passed)

    def test_evaluate_assertion_greater_than(self):
        assertion = Assertion(type=AssertionType.GREATER_THAN, expected="10", target_field="stdout")
        res = evaluate_assertion(assertion, {"stdout": "25"})
        self.assertTrue(res.passed)
        res_fail = evaluate_assertion(assertion, {"stdout": "5"})
        self.assertFalse(res_fail.passed)

    def test_evaluate_assertion_regex_bounded(self):
        # SEC-14: Target strings > 100KB are safely truncated
        massive_str = "a" * 150_000 + "target"
        assertion = Assertion(type=AssertionType.MATCHES_REGEX, expected=r"^a+", target_field="stdout")
        res = evaluate_assertion(assertion, {"stdout": massive_str})
        self.assertTrue(res.passed)

