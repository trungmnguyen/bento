"""DistillMemoryUseCase: Extracts lessons from self-healing iterations and updates the persistent memory bank."""
from __future__ import annotations
from bento.domain.models import AutoLoopResult, MemoryLesson, Scenario
from bento.domain.ports import MemoryGateway
from bento.domain.rules import (
    extract_lessons_from_iterations,
    synthesize_regression_scenario,
)


class DistillMemoryUseCase:
    def __init__(self, memory_gateway: MemoryGateway):
        self._memory_gateway = memory_gateway

    def execute(
        self,
        task_name: str,
        scenario: Scenario,
        loop_result: AutoLoopResult,
        working_dir: str | None = None,
        auto_generate_regression: bool = True,
    ) -> list[MemoryLesson]:
        if not loop_result.succeeded or loop_result.total_iterations <= 1:
            return []

        # 1. Distill new lessons
        new_lessons = extract_lessons_from_iterations(
            task_name=task_name,
            scenario=scenario,
            iterations=loop_result.iterations,
        )

        if not new_lessons:
            return []

        # 2. Persist to memory bank
        memory_bank = self._memory_gateway.load_memory(working_dir=working_dir)
        for lesson in new_lessons:
            memory_bank = memory_bank.add_lesson(lesson)
            if auto_generate_regression:
                reg_scenario = synthesize_regression_scenario(scenario, lesson)
                self._memory_gateway.save_regression_scenario(reg_scenario, working_dir=working_dir)

        self._memory_gateway.save_memory(memory_bank, working_dir=working_dir)
        return new_lessons
