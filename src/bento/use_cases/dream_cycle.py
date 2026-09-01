"""DreamCycleUseCase: Orchestrates overnight maintenance, memory consolidation, and regression verification."""
from __future__ import annotations
import time
from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.domain.models import DreamCycleResult, Scenario
from bento.domain.ports import MemoryGateway, StorageGateway
from bento.use_cases.run_suite import RunSuiteUseCase


class DreamCycleUseCase:
    def __init__(
        self,
        memory_gateway: MemoryGateway,
        storage_gateway: StorageGateway,
        run_suite_use_case: RunSuiteUseCase,
    ):
        self._memory_gateway = memory_gateway
        self._storage = storage_gateway
        self._run_suite = run_suite_use_case

    def execute(
        self,
        benchmarks_dir: str,
        working_dir: str | None = None,
    ) -> DreamCycleResult:
        start_time = time.monotonic()

        # 1. Load memory bank
        memory_bank = self._memory_gateway.load_memory(working_dir=working_dir)

        # 2. Collect all scenarios (including auto-generated regression tests)
        scenario_files = self._storage.list_files(benchmarks_dir, pattern="*.json")
        scenarios: list[Scenario] = []
        for f_path in sorted(scenario_files):
            try:
                content = self._storage.read_text(f_path)
                scenarios.append(ScenarioParser.from_json(content))
            except Exception:
                continue

        # 3. Run full benchmark battery (sparring)
        suite_result = self._run_suite.execute(
            scenarios=scenarios,
            suite_name="Bento Dream-Cycle Verification Battery",
        )

        total_duration_ms = (time.monotonic() - start_time) * 1000.0

        return DreamCycleResult(
            consolidated_lessons_count=len(memory_bank.lessons),
            new_lessons_discovered=0,
            suite_result=suite_result,
            total_duration_ms=total_duration_ms,
        )
