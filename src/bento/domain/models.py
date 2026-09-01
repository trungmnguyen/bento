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
    target_field: str = "stdout"
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


# --- Level 2: Autonomous Loop Domain Models ---

class AutoLoopStatus(str, Enum):
    SUCCESS = "SUCCESS"
    BUDGET_EXHAUSTED = "BUDGET_EXHAUSTED"
    ERROR = "ERROR"


@dataclass(frozen=True)
class AgentResponse:
    content: str
    exit_code: int = 0
    raw_output: str = ""


@dataclass(frozen=True)
class AutoLoopIteration:
    iteration_num: int
    prompt_sent: str
    agent_response: AgentResponse
    scenario_result: ScenarioResult


@dataclass(frozen=True)
class AutoLoopResult:
    task_name: str
    status: AutoLoopStatus
    total_iterations: int
    max_iterations: int
    iterations: list[AutoLoopIteration]
    final_scenario_result: ScenarioResult | None
    total_duration_ms: float
    committed: bool = False
    distilled_lessons: list[MemoryLesson] = field(default_factory=list)

    @property
    def succeeded(self) -> bool:
        return self.status == AutoLoopStatus.SUCCESS


# --- Level 3: Lifelong Memory & Self-Evolution Domain Models ---

@dataclass(frozen=True)
class MemoryLesson:
    id: str
    title: str
    category: str
    context: str
    rule: str
    anti_pattern: str = ""
    discovery_date: str = ""
    tags: list[str] = field(default_factory=list)
    source_scenario: str = ""


@dataclass(frozen=True)
class MemoryBank:
    lessons: list[MemoryLesson] = field(default_factory=list)
    version: str = "1.0"
    updated_at: str = ""

    def add_lesson(self, lesson: MemoryLesson) -> MemoryBank:
        filtered = [l for l in self.lessons if l.id != lesson.id]
        return MemoryBank(
            lessons=filtered + [lesson],
            version=self.version,
            updated_at=lesson.discovery_date or self.updated_at,
        )


@dataclass(frozen=True)
class DreamCycleResult:
    consolidated_lessons_count: int
    new_lessons_discovered: int
    suite_result: SuiteResult
    total_duration_ms: float


# --- Level 4: Adversarial Self-Play, Swarms & Optimizer Models ---

@dataclass(frozen=True)
class ArenaRound:
    round_num: int
    attacker_payload: str
    attacker_contract: Scenario
    builder_response: AgentResponse
    evaluation_result: ScenarioResult
    exploit_found: bool


@dataclass(frozen=True)
class ArenaResult:
    task_name: str
    rounds: list[ArenaRound]
    total_rounds: int
    total_exploits_found: int
    total_exploits_patched: int
    hardened: bool
    total_duration_ms: float


class SwarmRole(str, Enum):
    ARCHITECT = "ARCHITECT"
    BUILDER = "BUILDER"
    AUDITOR = "AUDITOR"
    JUDGE = "JUDGE"


@dataclass(frozen=True)
class SwarmTaskResult:
    role: SwarmRole
    task_name: str
    output_summary: str
    passed: bool
    duration_ms: float
    error_message: str | None = None


@dataclass(frozen=True)
class SwarmPipelineResult:
    pipeline_name: str
    task_results: list[SwarmTaskResult]
    passed: bool
    total_duration_ms: float


@dataclass(frozen=True)
class OptimizerCandidate:
    id: str
    model_name: str
    system_prompt_variant: str
    temperature: float = 0.0


@dataclass(frozen=True)
class OptimizerRanking:
    candidate: OptimizerCandidate
    pass_rate: float
    passed_scenarios: int
    total_scenarios: int
    total_duration_ms: float
    avg_latency_ms: float
    score: float


@dataclass(frozen=True)
class OptimizerResult:
    suite_name: str
    best_candidate: OptimizerCandidate
    rankings: list[OptimizerRanking]
    total_duration_ms: float
