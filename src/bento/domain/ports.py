"""Domain Ports / Gateway Interfaces for Bento.

Defines the contracts for execution, storage, agent invocation, swarms, worktrees, memory, and git.
"""
from __future__ import annotations
from typing import Protocol, runtime_checkable
from bento.domain.models import (
    AgentResponse,
    ArenaResult,
    DreamCycleResult,
    MemoryBank,
    MemoryLesson,
    OptimizerResult,
    Scenario,
    ScenarioResult,
    SuiteResult,
    SwarmPipelineResult,
    SwarmRole,
    TraceEvent,
)


@runtime_checkable
class ExecutionGateway(Protocol):
    def execute_command(
        self,
        command: str,
        cwd: str | None = None,
        env: dict[str, str] | None = None,
        timeout_sec: float = 30.0,
    ) -> tuple[int, str, str, float]:
        """Executes a command and returns (exit_code, stdout, stderr, duration_ms)."""
        ...


@runtime_checkable
class StorageGateway(Protocol):
    def read_text(self, path: str) -> str:
        """Reads and returns file contents as text."""
        ...

    def write_text(self, path: str, content: str) -> None:
        """Writes text to a specified file path."""
        ...

    def list_files(self, directory: str, pattern: str = "*") -> list[str]:
        """Lists matching files within a directory."""
        ...

    def file_exists(self, path: str) -> bool:
        """Checks if a file exists."""
        ...


@runtime_checkable
class AgentGateway(Protocol):
    def execute_agent_task(self, prompt: str, working_dir: str | None = None) -> AgentResponse:
        """Invokes the AI agent (Claude Code, Gemini, local model) to perform a task/code edit."""
        ...


@runtime_checkable
class SwarmGateway(Protocol):
    def execute_role(self, role: SwarmRole, prompt: str, working_dir: str | None = None) -> AgentResponse:
        """Dispatches a task to a specialized agent role (Architect, Builder, Auditor, Judge)."""
        ...


@runtime_checkable
class WorktreeGateway(Protocol):
    def create_worktree(self, branch_name: str, path: str) -> bool:
        """Creates an isolated git worktree branch."""
        ...

    def remove_worktree(self, path: str) -> bool:
        """Cleans up a git worktree."""
        ...

    def merge_branch(self, branch_name: str) -> bool:
        """Merges a green worktree branch into current HEAD."""
        ...


@runtime_checkable
class GitGateway(Protocol):
    def commit_changes(self, message: str, working_dir: str | None = None) -> bool:
        """Stages and commits changes to git repository."""
        ...


@runtime_checkable
class MemoryGateway(Protocol):
    def load_memory(self, working_dir: str | None = None) -> MemoryBank:
        """Loads the persistent memory bank."""
        ...

    def save_memory(self, memory: MemoryBank, working_dir: str | None = None) -> None:
        """Persists the memory bank to disk."""
        ...

    def save_regression_scenario(self, scenario: Scenario, working_dir: str | None = None) -> str:
        """Saves an auto-generated regression scenario to the benchmark suite directory."""
        ...


@runtime_checkable
class TraceGateway(Protocol):
    def append_trace_event(self, event: TraceEvent, working_dir: str | None = None) -> None:
        """Appends a structured trace event to persistent storage."""
        ...

    def load_recent_traces(self, max_traces: int = 50, working_dir: str | None = None) -> list[TraceEvent]:
        """Loads historical trace events from storage."""
        ...


@runtime_checkable
class PresenterGateway(Protocol):
    def format_scenario_result(self, result: ScenarioResult, verbose: bool = False) -> str:
        """Formats a scenario result for display."""
        ...

    def format_suite_result(self, result: SuiteResult) -> str:
        """Formats a benchmark / suite result for display."""
        ...

    def format_dream_cycle_result(self, result: DreamCycleResult) -> str:
        """Formats the dream cycle report for display."""
        ...

    def format_arena_result(self, result: ArenaResult) -> str:
        """Formats adversarial sparring results."""
        ...

    def format_swarm_result(self, result: SwarmPipelineResult) -> str:
        """Formats multi-agent swarm pipeline execution results."""
        ...

    def format_optimizer_result(self, result: OptimizerResult) -> str:
        """Formats model / prompt optimization rankings."""
        ...


@runtime_checkable
class ClockGateway(Protocol):
    def now_iso(self) -> str:
        """Returns current ISO timestamp."""
        ...

    def monotonic_ms(self) -> float:
        """Returns monotonic clock reading in milliseconds."""
        ...
