"""DreamCycleUseCase: Orchestrates overnight maintenance, trace harvesting, memory consolidation, and regression verification."""
from __future__ import annotations
import time
from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.domain.models import CrystallizedSkill, DreamCycleResult, MemoryLesson, Scenario
from bento.domain.ports import MemoryGateway, StorageGateway, TraceGateway
from bento.domain.rules import analyze_traces_for_lessons, detect_recurring_skill_patterns
from bento.use_cases.run_suite import RunSuiteUseCase


class DreamCycleUseCase:
    def __init__(
        self,
        memory_gateway: MemoryGateway,
        storage_gateway: StorageGateway,
        run_suite_use_case: RunSuiteUseCase,
        trace_gateway: TraceGateway | None = None,
    ):
        self._memory_gateway = memory_gateway
        self._storage = storage_gateway
        self._run_suite = run_suite_use_case
        self._trace_gateway = trace_gateway

    def execute(
        self,
        benchmarks_dir: str,
        working_dir: str | None = None,
        harvest_traces: bool = True,
    ) -> DreamCycleResult:
        start_time = time.monotonic()

        # 1. Load memory bank
        memory_bank = self._memory_gateway.load_memory(working_dir=working_dir)

        # 2. Harvest traces (REM Sleep: turn yesterday's logs into memory & skills)
        harvested_lessons: list[MemoryLesson] = []
        crystallized_skills: list[CrystallizedSkill] = []

        if harvest_traces and self._trace_gateway:
            recent_traces = self._trace_gateway.load_recent_traces(max_traces=100, working_dir=working_dir)
            existing_ids = {l.id for l in memory_bank.lessons}
            harvested_lessons = analyze_traces_for_lessons(recent_traces, existing_lesson_ids=existing_ids)
            crystallized_skills = detect_recurring_skill_patterns(recent_traces)

            # Persist newly harvested lessons into memory bank
            if harvested_lessons:
                for lesson in harvested_lessons:
                    memory_bank = memory_bank.add_lesson(lesson)
                self._memory_gateway.save_memory(memory_bank, working_dir=working_dir)

        # 3. Collect all scenarios (including auto-generated regression tests)
        scenario_files = self._storage.list_files(benchmarks_dir, pattern="*.json")
        scenarios: list[Scenario] = []
        for f_path in sorted(scenario_files):
            try:
                content = self._storage.read_text(f_path)
                scenarios.append(ScenarioParser.from_json(content))
            except Exception:
                continue

        # 4. Run full benchmark battery (sparring)
        suite_result = self._run_suite.execute(
            scenarios=scenarios,
            suite_name="Bento Dream-Cycle Verification Battery",
        )

        total_duration_ms = (time.monotonic() - start_time) * 1000.0

        return DreamCycleResult(
            consolidated_lessons_count=len(memory_bank.lessons),
            new_lessons_discovered=len(harvested_lessons),
            suite_result=suite_result,
            total_duration_ms=total_duration_ms,
            harvested_lessons=harvested_lessons,
            crystallized_skills=crystallized_skills,
        )

