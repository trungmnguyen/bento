"""Pure Domain Evaluation & Memory Distillation Rules for Bento.

All logic is deterministic, functional, and decoupled from any I/O.
"""
from __future__ import annotations
import datetime
import hashlib
import json
import re
from typing import Any
from bento.domain.models import (
    Assertion,
    AssertionResult,
    AssertionType,
    AutoLoopIteration,
    MemoryBank,
    MemoryLesson,
    Scenario,
    ScenarioResult,
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
        message=message,
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


def build_initial_agent_prompt(
    task_description: str,
    scenario: Scenario,
    relevant_lessons: list[MemoryLesson] | None = None,
) -> str:
    lines = [
        "You are the Builder Agent in the Bento Harness Engineering loop.",
        "",
        "TASK OBJECTIVE:",
        task_description.strip(),
        "",
        f"HARNESS VERIFICATION CONTRACT ({scenario.name}):",
        "Your code will be evaluated by Bento against the following deterministic steps:",
    ]
    for idx, step in enumerate(scenario.steps, 1):
        lines.append(f"  Step {idx}: {step.name}")
        lines.append(f"    Command: {step.command}")
        for a in step.assertions:
            desc = a.description or a.type.value
            lines.append(f"    - Expects: {desc} ({a.type.value}: {a.expected})")

    if relevant_lessons:
        lines.append("")
        lines.append("🧠 BENTO MEMORY GUARDS (Past Architectural Lessons & Bug Guards):")
        for lesson in relevant_lessons:
            lines.append(f"  - [{lesson.id}] {lesson.title}")
            lines.append(f"    Rule: {lesson.rule}")
            if lesson.anti_pattern:
                lines.append(f"    Avoid Anti-Pattern: {lesson.anti_pattern}")

    lines.append("")
    lines.append("Please implement or edit the necessary code files directly to fulfill this contract.")
    return "\n".join(lines)


def build_corrective_agent_prompt(
    task_description: str,
    scenario_result: ScenarioResult,
    iteration: int,
) -> str:
    lines = [
        f"Bento Harness Verification FAILED on iteration {iteration}.",
        "Please inspect the failure details below and fix the implementation.",
        "",
        "TASK OBJECTIVE:",
        task_description.strip(),
        "",
        "FAILED VERIFICATION REPORT:",
    ]
    for step in scenario_result.step_results:
        if step.status != StepStatus.PASSED:
            lines.append(f"❌ Step FAILED: {step.step_name}")
            lines.append(f"   Command: {step.command}")
            lines.append(f"   Exit Code: {step.exit_code}")
            if step.assertion_results:
                for a_res in step.assertion_results:
                    if not a_res.passed:
                        desc = a_res.assertion.description or a_res.assertion.type.value
                        lines.append(f"   - Failed Assertion [{desc}]: {a_res.message}")
            if step.stderr:
                lines.append(f"   Stderr Output:\n   {step.stderr.strip()}")
            if step.stdout:
                lines.append(f"   Stdout Output:\n   {step.stdout.strip()}")

    lines.append("")
    lines.append("Please edit the code files to resolve these specific errors and satisfy all assertions.")
    return "\n".join(lines)


# --- Memory Distillation & Retrieval Rules ---

def filter_relevant_lessons(
    memory_bank: MemoryBank,
    tags: list[str],
    task_description: str,
) -> list[MemoryLesson]:
    """Pure keyword and tag matching to retrieve applicable memory lessons."""
    task_lower = task_description.lower()
    tags_lower = [t.lower() for t in tags]
    relevant: list[MemoryLesson] = []

    for lesson in memory_bank.lessons:
        # Match if tag intersects
        lesson_tags = [t.lower() for t in lesson.tags]
        if any(t in lesson_tags for t in tags_lower):
            relevant.append(lesson)
            continue

        # Match category or keywords in task description
        if lesson.category.lower() in task_lower or lesson.title.lower() in task_lower:
            relevant.append(lesson)
            continue

        # Check tag matches in text
        if any(t in task_lower for t in lesson_tags):
            relevant.append(lesson)

    return relevant


def extract_lessons_from_iterations(
    task_name: str,
    scenario: Scenario,
    iterations: list[AutoLoopIteration],
    timestamp: str = "",
) -> list[MemoryLesson]:
    """Analyzes failed earlier iterations and synthesizes permanent memory lessons."""
    if len(iterations) <= 1:
        return []

    final_iter = iterations[-1]
    if not final_iter.scenario_result.passed:
        return []

    lessons: list[MemoryLesson] = []
    # Inspect first failed iteration
    failed_iter = iterations[0]
    for step in failed_iter.scenario_result.step_results:
        if step.status != StepStatus.PASSED:
            # Generate deterministic lesson ID
            h = hashlib.sha256(f"{scenario.name}_{step.step_name}_{step.command}".encode()).hexdigest()[:8]
            lesson_id = f"MEM-{h.upper()}"

            category = "edge-case"
            if "zero" in (step.stderr + step.stdout).lower():
                category = "arithmetic-safety"
            elif "syntax" in (step.stderr + step.stdout).lower():
                category = "syntax-rule"
            elif any("quant" in t.lower() or "trade" in t.lower() for t in scenario.tags):
                category = "quant-engineering"

            error_summary = step.error_message or step.stderr.splitlines()[-1] if step.stderr else "Assertion check failed"
            rule_text = f"Ensure step '{step.step_name}' succeeds against '{step.command}' by handling edge cases ({error_summary})."
            anti_pattern_text = f"Failing assertion or crashing with: {error_summary}"

            lesson = MemoryLesson(
                id=lesson_id,
                title=f"Guard for {step.step_name} in {scenario.name}",
                category=category,
                context=f"Discovered during self-healing iteration loop for scenario '{scenario.name}'.",
                rule=rule_text,
                anti_pattern=anti_pattern_text,
                discovery_date=timestamp or datetime.datetime.now().strftime("%Y-%m-%d"),
                tags=scenario.tags + [category],
                source_scenario=scenario.name,
            )
            lessons.append(lesson)

    return lessons


def synthesize_regression_scenario(scenario: Scenario, lesson: MemoryLesson) -> Scenario:
    """Clones a scenario and marks it as a permanent regression contract in the suite."""
    tags = list(set(scenario.tags + ["regression", "auto-generated", lesson.category]))
    return Scenario(
        name=f"[Regression] {scenario.name}",
        description=f"Auto-generated regression test from Lesson {lesson.id}: {lesson.title}",
        tags=tags,
        working_dir=scenario.working_dir,
        steps=scenario.steps,
        max_loop_iterations=scenario.max_loop_iterations,
        metadata={"lesson_id": lesson.id, "source_scenario": scenario.name},
    )
