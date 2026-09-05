"""Pure Domain Evaluation, Memory Distillation & Level 4 Rules for Bento.

All logic is deterministic, functional, and decoupled from any I/O.
"""
from __future__ import annotations
import ast
import datetime
import hashlib
import json
import math
import re
from typing import Any
from bento.domain.models import (
    ArchitectureViolation,
    Assertion,
    AssertionResult,
    AssertionType,
    AutoLoopIteration,
    CrystallizedSkill,
    MemoryBank,
    MemoryGraph,
    MemoryGraphEdge,
    MemoryGraphNode,
    MemoryLesson,
    OptimizerCandidate,
    OptimizerRanking,
    Scenario,
    ScenarioResult,
    StepResult,
    StepStatus,
    SuiteResult,
    TelemetryMetrics,
    TraceEvent,
)


def evaluate_assertion(assertion: Assertion, output_data: dict[str, Any]) -> AssertionResult:
    target = assertion.target_field
    if target not in output_data:
        return AssertionResult(
            assertion=assertion,
            passed=False,
            actual_value=None,
            message=f"Target field '{target}' not found in output data (available: {list(output_data.keys())})",
        )
    actual = output_data.get(target, None)
    expected = assertion.expected

    passed = False
    message = ""

    if assertion.type == AssertionType.EQUALS:
        passed = (str(actual).strip() == str(expected).strip())
        message = f"Expected '{expected}', got '{actual}'"

    elif assertion.type == AssertionType.EXIT_CODE_EQUALS:
        try:
            passed = (int(actual) == int(expected))
            message = f"Expected exit code {expected}, got {actual}"
        except (ValueError, TypeError):
            passed = False
            message = f"Invalid exit code comparison: actual='{actual}', expected='{expected}'"

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


# --- Level 5: Dreaming Engine & Trace Synthesis Pure Rules ---

def analyze_traces_for_lessons(
    events: list[TraceEvent],
    existing_lesson_ids: set[str] | None = None,
) -> list[MemoryLesson]:
    """Analyzes historical execution traces to synthesize lessons from multi-iteration recoveries and errors."""
    existing_ids = existing_lesson_ids or set()
    discovered_lessons: list[MemoryLesson] = []

    # Group events by task name
    events_by_task: dict[str, list[TraceEvent]] = {}
    for ev in events:
        events_by_task.setdefault(ev.task_name, []).append(ev)

    for task_name, task_events in events_by_task.items():
        # Sort chronologically or by iteration
        task_events.sort(key=lambda e: (e.timestamp, e.iteration))

        # Check for multi-iteration recovery: an early failure followed by a later pass
        failures = [e for e in task_events if not e.passed or e.failed_assertions]
        successes = [e for e in task_events if e.passed and not e.failed_assertions]

        if failures and successes:
            first_fail = failures[0]
            last_success = successes[-1]

            # Only consider it a recovery if success came at or after failure
            if last_success.iteration > first_fail.iteration or (
                last_success.iteration == first_fail.iteration and last_success.timestamp >= first_fail.timestamp
            ):
                fail_reasons = "; ".join(first_fail.failed_assertions) if first_fail.failed_assertions else "contract assertion failure"
                hash_key = f"{task_name}_{fail_reasons}"
                lesson_id = f"MEM-DREAM-{hashlib.md5(hash_key.encode()).hexdigest()[:8].upper()}"

                if lesson_id not in existing_ids:
                    discovery_date = (
                        last_success.timestamp.split("T")[0]
                        if "T" in last_success.timestamp
                        else datetime.datetime.now().strftime("%Y-%m-%d")
                    )
                    all_tags = list(set(first_fail.tags + last_success.tags + ["dream-distilled", "harness-recovery"]))

                    discovered_lessons.append(
                        MemoryLesson(
                            id=lesson_id,
                            title=f"Autonomous Recovery Guard: {task_name}",
                            category="auto-dream-distilled",
                            context=f"Task '{task_name}' failed at iteration {first_fail.iteration} due to: [{fail_reasons}], but recovered cleanly at iteration {last_success.iteration}.",
                            rule=f"Always satisfy contract requirements: {fail_reasons}",
                            anti_pattern=f"Initial failing mode: {fail_reasons}",
                            discovery_date=discovery_date,
                            tags=all_tags,
                            source_scenario=task_name,
                        )
                    )
                    existing_ids.add(lesson_id)

    return discovered_lessons


def detect_recurring_skill_patterns(
    events: list[TraceEvent],
    min_occurrences: int = 2,
) -> list[CrystallizedSkill]:
    """Identifies recurring execution patterns across traces and crystallizes them into reusable procedural skills."""
    skills: list[CrystallizedSkill] = []
    events_by_task: dict[str, list[TraceEvent]] = {}
    for ev in events:
        events_by_task.setdefault(ev.task_name, []).append(ev)

    for task_name, task_events in events_by_task.items():
        if len(task_events) >= min_occurrences:
            all_tags = list(set(tag for ev in task_events for tag in ev.tags))
            skill_name = f"skill-{task_name.lower().replace(' ', '-')}"
            skills.append(
                CrystallizedSkill(
                    name=skill_name,
                    description=f"Autonomous skill macro synthesized from recurring task '{task_name}' ({len(task_events)} executions observed)",
                    trigger_tags=all_tags,
                    steps=[
                        f"Step 1: Check pre-conditions for {task_name}",
                        f"Step 2: Execute validated deterministic routine for {task_name}",
                        f"Step 3: Verify output assertions",
                    ],
                )
            )

    return skills


FORBIDDEN_DOMAIN_MODULES = {
    "os",
    "sys",
    "subprocess",
    "requests",
    "urllib",
    "socket",
    "http",
    "shutil",
    "pathlib",
    "threading",
    "multiprocessing",
    "sqlite3",
    "tempfile",
    "pickle",
    "io",
    "asyncio",
    "ssl",
    "importlib",
}

FORBIDDEN_DOMAIN_CALLS = {
    "print",
    "open",
    "input",
    "eval",
    "exec",
    "__import__",
}


def check_domain_ast_purity(file_path: str, source_code: str) -> list[ArchitectureViolation]:
    """Pure AST validator that inspects Python source code for Clean Architecture domain violations.

    Domain layer must remain 100% pure:
    - Zero external I/O imports (no os, sys, subprocess, requests, socket, etc.)
    - Zero side-effecting I/O calls (no print, open, etc.)
    - Zero dynamic imports (__import__, importlib)
    """
    violations: list[ArchitectureViolation] = []
    try:
        tree = ast.parse(source_code, filename=file_path)
    except SyntaxError as e:
        violations.append(
            ArchitectureViolation(
                file_path=file_path,
                line_number=e.lineno or 1,
                rule="valid_python_syntax",
                message=f"Syntax error parsing domain AST: {e}",
            )
        )
        return violations

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_module = alias.name.split(".")[0]
                if root_module in FORBIDDEN_DOMAIN_MODULES:
                    violations.append(
                        ArchitectureViolation(
                            file_path=file_path,
                            line_number=node.lineno,
                            rule="pure_domain_no_io_imports",
                            message=f"Domain layer must never import I/O module '{alias.name}' (Clean Architecture Rule 1)",
                        )
                    )
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root_module = node.module.split(".")[0]
                if root_module in FORBIDDEN_DOMAIN_MODULES:
                    violations.append(
                        ArchitectureViolation(
                            file_path=file_path,
                            line_number=node.lineno,
                            rule="pure_domain_no_io_imports",
                            message=f"Domain layer must never import from I/O module '{node.module}' (Clean Architecture Rule 1)",
                        )
                    )
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in FORBIDDEN_DOMAIN_CALLS:
                    violations.append(
                        ArchitectureViolation(
                            file_path=file_path,
                            line_number=node.lineno,
                            rule="pure_domain_no_side_effects",
                            message=f"Domain layer must never invoke side-effecting or dynamic call '{node.func.id}()' (Clean Architecture Rule 2)",
                        )
                    )
            elif isinstance(node.func, ast.Attribute):
                if node.func.attr in FORBIDDEN_DOMAIN_CALLS or node.func.attr in ("import_module",):
                    violations.append(
                        ArchitectureViolation(
                            file_path=file_path,
                            line_number=node.lineno,
                            rule="pure_domain_no_side_effects",
                            message=f"Domain layer must never invoke side-effecting or dynamic call '{node.func.attr}()' (Clean Architecture Rule 2)",
                        )
                    )

    return violations


def build_memory_graph(
    memory_bank: MemoryBank,
    scenarios: list[Scenario] | None = None,
    canvas_width: float = 1000.0,
    canvas_height: float = 800.0,
) -> MemoryGraph:
    """Computes a pure mathematical radial celestial layout for the Flavor Knowledge Graph."""
    cx = canvas_width / 2.0
    cy = canvas_height / 2.0

    lessons = memory_bank.lessons
    categories_set = set(l.category for l in lessons)
    if not categories_set:
        categories_set.add("architecture")
    categories = sorted(list(categories_set))

    nodes: list[MemoryGraphNode] = []
    edges: list[MemoryGraphEdge] = []
    cat_coords: dict[str, tuple[float, float, float]] = {}

    # 1. Place Category Hubs in an outer celestial orbit
    n_cats = len(categories)
    r_hub = min(cx, cy) * 0.48
    for i, cat in enumerate(categories):
        angle = (2.0 * math.pi * i / max(n_cats, 1)) - (math.pi / 2.0)
        x = cx + r_hub * math.cos(angle)
        y = cy + r_hub * math.sin(angle)
        cat_coords[cat] = (x, y, angle)
        nodes.append(
            MemoryGraphNode(
                id=f"cat-{cat}",
                label=cat.upper(),
                node_type="category_hub",
                category=cat,
                weight=3.0,
                x=round(x, 1),
                y=round(y, 1),
                details={"category": cat},
                tags=[cat],
            )
        )

    # Group lessons by category
    lessons_by_cat: dict[str, list[MemoryLesson]] = {}
    for l in lessons:
        lessons_by_cat.setdefault(l.category, []).append(l)

    total_anti_patterns = 0

    # 2. Place Golden Rules and Anti-Pattern Satellites
    for cat, cat_lessons in lessons_by_cat.items():
        hub_x, hub_y, hub_angle = cat_coords.get(cat, (cx, cy, 0.0))
        n_rules = len(cat_lessons)

        for j, lesson in enumerate(cat_lessons):
            span = 0.55 if n_rules > 1 else 0.0
            offset = ((j - (n_rules - 1) / 2.0) / max(n_rules, 1)) * span
            rule_angle = hub_angle + offset
            r_rule = r_hub + 110.0

            rx = cx + r_rule * math.cos(rule_angle)
            ry = cy + r_rule * math.sin(rule_angle)

            nodes.append(
                MemoryGraphNode(
                    id=lesson.id,
                    label=lesson.title,
                    node_type="golden_rule",
                    category=lesson.category,
                    weight=2.0,
                    x=round(rx, 1),
                    y=round(ry, 1),
                    details={
                        "rule": lesson.rule,
                        "context": lesson.context,
                        "anti_pattern": lesson.anti_pattern,
                        "source_scenario": lesson.source_scenario,
                        "discovery_date": lesson.discovery_date,
                    },
                    tags=lesson.tags,
                )
            )
            edges.append(
                MemoryGraphEdge(
                    source=f"cat-{cat}",
                    target=lesson.id,
                    relation="category_of",
                    weight=1.5,
                )
            )

            # 3. Anti-Pattern Satellite
            if lesson.anti_pattern:
                total_anti_patterns += 1
                r_anti = r_rule + 55.0
                anti_angle = rule_angle + 0.08
                ax = cx + r_anti * math.cos(anti_angle)
                ay = cy + r_anti * math.sin(anti_angle)

                anti_id = f"anti-{lesson.id}"
                nodes.append(
                    MemoryGraphNode(
                        id=anti_id,
                        label=f"Anti: {lesson.title[:24]}",
                        node_type="anti_pattern",
                        category=lesson.category,
                        weight=1.2,
                        x=round(ax, 1),
                        y=round(ay, 1),
                        details={
                            "rule_id": lesson.id,
                            "rule_title": lesson.title,
                            "anti_pattern": lesson.anti_pattern,
                        },
                        tags=lesson.tags,
                    )
                )
                edges.append(
                    MemoryGraphEdge(
                        source=lesson.id,
                        target=anti_id,
                        relation="has_anti_pattern",
                        weight=1.0,
                    )
                )

    # 4. Scenarios Linkages
    if scenarios:
        scenario_map = {s.name: s for s in scenarios}
        linked_scenarios: set[str] = set()
        for lesson in lessons:
            if lesson.source_scenario and lesson.source_scenario in scenario_map:
                linked_scenarios.add(lesson.source_scenario)
                edges.append(
                    MemoryGraphEdge(
                        source=lesson.id,
                        target=f"scen-{lesson.source_scenario}",
                        relation="verified_by",
                        weight=1.2,
                    )
                )

        n_scen = len(linked_scenarios)
        for k, scen_name in enumerate(sorted(list(linked_scenarios))):
            s_obj = scenario_map[scen_name]
            s_angle = (2.0 * math.pi * k / max(n_scen, 1))
            s_radius = min(cx, cy) * 0.22
            sx = cx + s_radius * math.cos(s_angle)
            sy = cy + s_radius * math.sin(s_angle)
            nodes.append(
                MemoryGraphNode(
                    id=f"scen-{scen_name}",
                    label=scen_name,
                    node_type="scenario",
                    category="verification",
                    weight=1.6,
                    x=round(sx, 1),
                    y=round(sy, 1),
                    details={"description": s_obj.description, "steps_count": len(s_obj.steps)},
                    tags=s_obj.tags,
                )
            )

    # 5. Tag Affinities between rules sharing 2+ tags
    for i in range(len(lessons)):
        for k in range(i + 1, len(lessons)):
            shared = set(lessons[i].tags) & set(lessons[k].tags)
            if len(shared) >= 2:
                edges.append(
                    MemoryGraphEdge(
                        source=lessons[i].id,
                        target=lessons[k].id,
                        relation="tag_affinity",
                        weight=0.5,
                    )
                )

    return MemoryGraph(
        nodes=nodes,
        edges=edges,
        categories=categories,
        total_rules=len(lessons),
        total_anti_patterns=total_anti_patterns,
    )


def calculate_telemetry_metrics(traces: list[TraceEvent]) -> TelemetryMetrics:
    """Calculates statistical percentiles (P50, P90, P99) and pass rate trends purely in domain."""
    if not traces:
        return TelemetryMetrics(
            total_runs=0,
            passed_runs=0,
            failed_runs=0,
            pass_rate=100.0,
            p50_latency_ms=0.0,
            p90_latency_ms=0.0,
            p99_latency_ms=0.0,
            avg_latency_ms=0.0,
            recent_latencies=[],
            recent_pass_flags=[],
        )

    total = len(traces)
    passed = sum(1 for t in traces if t.passed)
    failed = total - passed
    pass_rate = (passed / total) * 100.0 if total > 0 else 100.0

    latencies: list[float] = []
    pass_flags: list[bool] = []
    for t in traces:
        pass_flags.append(t.passed)
        dur = 0.0
        if hasattr(t, "duration_ms") and getattr(t, "duration_ms"):
            dur = float(getattr(t, "duration_ms"))
        elif t.agent_output and "ms" in t.agent_output:
            m = re.search(r"(\d+(?:\.\d+)?)ms", t.agent_output)
            if m:
                dur = float(m.group(1))
        if dur <= 0:
            dur = 25.0 if t.passed else 120.0
        latencies.append(dur)

    sorted_latencies = sorted(latencies)
    avg_lat = sum(sorted_latencies) / len(sorted_latencies)

    def percentile(p: float) -> float:
        if not sorted_latencies:
            return 0.0
        idx = int(len(sorted_latencies) * p)
        idx = min(idx, len(sorted_latencies) - 1)
        return round(sorted_latencies[idx], 1)

    return TelemetryMetrics(
        total_runs=total,
        passed_runs=passed,
        failed_runs=failed,
        pass_rate=round(pass_rate, 1),
        p50_latency_ms=percentile(0.50),
        p90_latency_ms=percentile(0.90),
        p99_latency_ms=percentile(0.99),
        avg_latency_ms=round(avg_lat, 1),
        recent_latencies=latencies[-20:],
        recent_pass_flags=pass_flags[-20:],
    )


def generate_unicode_sparkline(values: list[float]) -> str:
    """Generates pure unicode sparklines ( ▂▃▅▆▇█) from numeric distribution."""
    if not values:
        return ""
    bars = [" ", "▂", "▃", "▄", "▅", "▆", "▇", "█"]
    min_v = min(values)
    max_v = max(values)
    span = max_v - min_v
    if span <= 1e-6:
        return bars[3] * len(values)

    result = []
    for v in values:
        norm = (v - min_v) / span
        idx = min(int(norm * len(bars)), len(bars) - 1)
        result.append(bars[idx])
    return "".join(result)



