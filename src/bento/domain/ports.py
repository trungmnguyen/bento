"""Domain Ports / Gateway Interfaces for Bento.

Defines the contracts for execution, storage, timing, and formatting.
"""
from __future__ import annotations
from typing import Protocol, runtime_checkable
from bento.domain.models import ScenarioResult, SuiteResult


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
class PresenterGateway(Protocol):
    def format_scenario_result(self, result: ScenarioResult, verbose: bool = False) -> str:
        """Formats a scenario result for display."""
        ...

    def format_suite_result(self, result: SuiteResult) -> str:
        """Formats a benchmark / suite result for display."""
        ...


@runtime_checkable
class ClockGateway(Protocol):
    def now_iso(self) -> str:
        """Returns current ISO timestamp."""
        ...

    def monotonic_ms(self) -> float:
        """Returns monotonic clock reading in milliseconds."""
        ...
