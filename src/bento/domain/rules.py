"""Pure Domain Evaluation, Memory Distillation & Level 4 Rules for Bento.

All logic is deterministic, functional, and decoupled from any I/O.
"""
from __future__ import annotations
import ast
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
    OptimizerCandidate,
    OptimizerRanking,
    Scenario,
    ScenarioResult,
    StepResult,
    StepStatus,
    SuiteResult,
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
    task_lower = task_description.lower()
    tags_lower = [t.lower() for t in tags]
    relevant: list[MemoryLesson] = []

    for lesson in memory_bank.lessons:
        lesson_tags = [t.lower() for t in lesson.tags]
        if any(t in lesson_tags for t in tags_lower):
            relevant.append(lesson)
            continue

        if lesson.category.lower() in task_lower or lesson.title.lower() in task_lower:
            relevant.append(lesson)
            continue

        if any(t in task_lower for t in lesson_tags):
            relevant.append(lesson)

    return relevant


def extract_lessons_from_iterations(
    task_name: str,
    scenario: Scenario,
    iterations: list[AutoLoopIteration],
    timestamp: str = "",
) -> list[MemoryLesson]:
    if len(iterations) <= 1:
        return []

    final_iter = iterations[-1]
    if not final_iter.scenario_result.passed:
        return []

    lessons: list[MemoryLesson] = []
    failed_iter = iterations[0]
    for step in failed_iter.scenario_result.step_results:
        if step.status != StepStatus.PASSED:
            h = hashlib.sha256(f"{scenario.name}_{step.step_name}_{step.command}".encode()).hexdigest()[:8]
            lesson_id = f"MEM-{h.upper()}"

            category = "edge-case"
            if "zero" in (step.stderr + step.stdout).lower():
                category = "arithmetic-safety"
            elif "syntax" in (step.stderr + step.stdout).lower():
                category = "syntax-rule"
            elif any("quant" in t.lower() or "trade" in t.lower() for t in scenario.tags):
                category = "quant-engineering"

            error_summary = step.error_message or (step.stderr.splitlines()[-1] if step.stderr else "Assertion check failed")
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


# --- Level 4: Adversarial Self-Play, Swarms & Optimizer Rules ---

def build_adversarial_attacker_prompt(
    task_description: str,
    base_scenario: Scenario,
    round_num: int,
    previous_exploits: list[str] | None = None,
) -> str:
    lines = [
        "You are the RED-TEAM ADVERSARIAL ATTACKER in the Bento Level 4 Arena.",
        f"Your mission in Round {round_num} is to find UNHANDLED EDGE CASES, FUZZING VULNERABILITIES, or RACE CONDITIONS in the Builder's code.",
        "",
        "TASK BEING TESTED:",
        task_description.strip(),
        "",
        "CURRENT VERIFIED SCENARIO:",
        f"Scenario Name: {base_scenario.name}",
    ]
    for idx, s in enumerate(base_scenario.steps, 1):
        lines.append(f"  Step {idx}: {s.name} ({s.command})")

    if previous_exploits:
        lines.append("")
        lines.append("ALREADY RESOLVED EXPLOITS (Do not repeat):")
        for exp in previous_exploits:
            lines.append(f"  - {exp}")

    lines.append("")
    lines.append("PRODUCE A NEW ADVERSARIAL TEST JSON CONTRACT containing extreme payloads (e.g. empty lists, negative values, NaN, flash-crash prices, concurrent bursts, malformed inputs).")
    lines.append("Output ONLY valid JSON for the adversarial scenario contract.")
    return "\n".join(lines)


def build_adversarial_builder_prompt(
    task_description: str,
    exploit_scenario: Scenario,
    failure_output: str,
) -> str:
    lines = [
        "⚔️ RED-TEAM EXPLOIT DETECTED in Bento Arena!",
        "The Adversarial Attacker agent discovered an unhandled edge case that crashed or failed your code.",
        "",
        "TASK OBJECTIVE:",
        task_description.strip(),
        "",
        f"ADVERSARIAL CONTRACT: {exploit_scenario.name}",
        "FAILURE TRACE:",
        failure_output.strip(),
        "",
        "Please HARDEN your implementation to defend against this exploit while maintaining all core functionality.",
    ]
    return "\n".join(lines)


def validate_clean_architecture_ast(file_path: str, code_content: str) -> list[str]:
    """Pure AST validator enforcing Clean Architecture boundaries on Python files."""
    violations: list[str] = []
    try:
        tree = ast.parse(code_content, filename=file_path)
    except SyntaxError as e:
        return [f"Syntax error parsing {file_path}: {e}"]

    is_domain_layer = "/domain/" in file_path or "\\domain\\" in file_path or file_path.startswith("domain/")

    if is_domain_layer:
        forbidden_modules = {"subprocess", "os", "sys", "requests", "urllib", "socket", "http", "sqlite3"}
        for node in ast.walk(tree):
            # Check imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    root_mod = alias.name.split(".")[0]
                    if root_mod in forbidden_modules:
                        violations.append(
                            f"Clean Architecture Violation in {file_path}:{node.lineno}: Domain layer must not import '{root_mod}' (I/O side-effect forbidden)."
                        )
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    root_mod = node.module.split(".")[0]
                    if root_mod in forbidden_modules:
                        violations.append(
                            f"Clean Architecture Violation in {file_path}:{node.lineno}: Domain layer must not import from '{root_mod}'."
                        )

            # Check forbidden calls (e.g. print)
            elif isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name) and node.func.id == "print":
                    violations.append(
                        f"Clean Architecture Violation in {file_path}:{node.lineno}: 'print()' call forbidden in domain layer. Use PresenterGateway."
                    )

    return violations


def rank_optimizer_candidates(
    results: list[tuple[OptimizerCandidate, SuiteResult]],
) -> list[OptimizerRanking]:
    """Ranks model/prompt candidates by score = pass_rate * 100 - (avg_latency_ms * 0.05)."""
    rankings: list[OptimizerRanking] = []

    for candidate, suite in results:
        pass_rate = suite.pass_rate
        avg_latency = (suite.total_duration_ms / max(1, suite.total_scenarios))
        # Higher pass rate is prioritized, with low latency breaking ties
        score = (pass_rate * 10.0) - (avg_latency * 0.01)

        rankings.append(
            OptimizerRanking(
                candidate=candidate,
                pass_rate=pass_rate,
                passed_scenarios=suite.passed_scenarios,
                total_scenarios=suite.total_scenarios,
                total_duration_ms=suite.total_duration_ms,
                avg_latency_ms=avg_latency,
                score=score,
            )
        )

    # Sort descending by score
    rankings.sort(key=lambda r: r.score, reverse=True)
    return rankings
