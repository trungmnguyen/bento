"""Pure Domain Evaluation Rules for Bento.

All logic is deterministic, functional, and decoupled from any I/O.
"""
from __future__ import annotations
import json
import re
from typing import Any
from bento.domain.models import (
    Assertion,
    AssertionResult,
    AssertionType,
    Scenario,
    StepResult,
    StepStatus,
)


def evaluate_assertion(assertion: Assertion, output_data: dict[str, Any]) -> AssertionResult:
    target = assertion.target_field
    actual = output_data.get(target, None)
    expected = assertion.expected

    passed = False
    message = ""

    if assertion.type == AssertionType.EQUALS:
        passed = (str(actual).strip() == str(expected).strip())
        message = f"Expected '{expected}', got '{actual}'"

    elif assertion.type == AssertionType.EXIT_CODE_EQUALS:
        passed = (int(actual) == int(expected))
        message = f"Expected exit code {expected}, got {actual}"

    elif assertion.type == AssertionType.CONTAINS:
        passed = (str(expected) in str(actual))
        message = f"Target '{target}' contains '{expected}': {passed}"

    elif assertion.type == AssertionType.NOT_CONTAINS:
        passed = (str(expected) not in str(actual))
        message = f"Target '{target}' does not contain '{expected}': {passed}"

    elif assertion.type == AssertionType.MATCHES_REGEX:
        try:
            pattern = re.compile(str(expected), re.MULTILINE | re.DOTALL)
            passed = bool(pattern.search(str(actual)))
            message = f"Regex '{expected}' matched against target: {passed}"
        except re.error as e:
            passed = False
            message = f"Invalid regex pattern '{expected}': {e}"

    elif assertion.type == AssertionType.JSON_KEY_EXISTS:
        try:
            parsed = json.loads(str(actual))
            passed = (isinstance(parsed, dict) and expected in parsed)
            message = f"Key '{expected}' found in JSON output: {passed}"
        except Exception:
            passed = False
            message = f"Target '{target}' is not valid JSON"

    elif assertion.type == AssertionType.MAX_DURATION_MS:
        try:
            passed = float(actual) <= float(expected)
            message = f"Duration {actual}ms <= limit {expected}ms: {passed}"
        except (ValueError, TypeError):
            passed = False
            message = f"Invalid duration value '{actual}'"

    return AssertionResult(
        assertion=assertion,
        passed=passed,
        actual_value=actual,
        message=message
    )


def determine_step_status(assertion_results: list[AssertionResult], exit_code: int) -> StepStatus:
    if exit_code != 0 and not any(r.assertion.type == AssertionType.EXIT_CODE_EQUALS for r in assertion_results):
        return StepStatus.FAILED

    if all(r.passed for r in assertion_results):
        return StepStatus.PASSED

    return StepStatus.FAILED


def validate_scenario(scenario: Scenario) -> list[str]:
    errors = []
    if not scenario.name or not scenario.name.strip():
        errors.append("Scenario must have a non-empty name")

    if not scenario.steps:
        errors.append("Scenario must have at least one step")

    for idx, step in enumerate(scenario.steps):
        if not step.name or not step.name.strip():
            errors.append(f"Step #{idx+1} must have a non-empty name")
        if not step.command or not step.command.strip():
            errors.append(f"Step '{step.name}' must have a non-empty command")
        if step.timeout_sec <= 0:
            errors.append(f"Step '{step.name}' timeout_sec must be greater than 0")

    return errors
