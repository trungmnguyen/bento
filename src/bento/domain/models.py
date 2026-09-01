"""Pure Domain Models for Bento Harness Engineering System.

These entities have zero external dependencies and perform no I/O.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class AssertionType(str, Enum):
    EQUALS = "EQUALS"
    CONTAINS = "CONTAINS"
    NOT_CONTAINS = "NOT_CONTAINS"
    MATCHES_REGEX = "MATCHES_REGEX"
    EXIT_CODE_EQUALS = "EXIT_CODE_EQUALS"
    JSON_KEY_EXISTS = "JSON_KEY_EXISTS"
    MAX_DURATION_MS = "MAX_DURATION_MS"


class StepStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    ERROR = "ERROR"


@dataclass(frozen=True)
class Assertion:
    type: AssertionType
    expected: Any
    target_field: str = "stdout"  # "stdout", "stderr", "exit_code", "duration_ms"
    description: str = ""


@dataclass(frozen=True)
class AssertionResult:
    assertion: Assertion
    passed: bool
    actual_value: Any
    message: str


@dataclass(frozen=True)
class Step:
    name: str
    command: str
    cwd: str | None = None
    env: dict[str, str] = field(default_factory=dict)
    timeout_sec: float = 30.0
    assertions: list[Assertion] = field(default_factory=list)
    max_retries: int = 0
    feedback_template: str = ""


@dataclass(frozen=True)
class StepResult:
    step_name: str
    command: str
    status: StepStatus
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: float
    assertion_results: list[AssertionResult] = field(default_factory=list)
    error_message: str | None = None


@dataclass(frozen=True)
class Scenario:
    name: str
    description: str = ""
    tags: list[str] = field(default_factory=list)
    working_dir: str | None = None
    steps: list[Step] = field(default_factory=list)
    max_loop_iterations: int = 1
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ScenarioResult:
    scenario_name: str
    status: StepStatus
    step_results: list[StepResult]
    total_duration_ms: float
    loop_iterations: int = 1
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def passed(self) -> bool:
        return self.status == StepStatus.PASSED


@dataclass(frozen=True)
class SuiteResult:
    suite_name: str
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    total_duration_ms: float
    scenario_results: list[ScenarioResult]

    @property
    def pass_rate(self) -> float:
        if self.total_scenarios == 0:
            return 100.0
        return (self.passed_scenarios / self.total_scenarios) * 100.0

    @property
    def all_passed(self) -> bool:
        return self.failed_scenarios == 0
