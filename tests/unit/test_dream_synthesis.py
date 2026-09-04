"""Unit tests for Level 5: Autonomous Dreaming & Trace Synthesis Rules."""
import unittest
from pathlib import Path
from bento.domain.models import TraceEvent, MemoryBank, MemoryLesson
from bento.domain.rules import (
    analyze_traces_for_lessons,
    detect_recurring_skill_patterns,
    validate_clean_architecture_ast,
)


class TestDreamSynthesisRules(unittest.TestCase):
    def test_synthesizes_lesson_from_multi_iteration_recovery(self):
        events = [
            TraceEvent(
                timestamp="2026-09-03T10:00:00",
                task_name="Calculate RSI Indicator",
                iteration=1,
                event_type="iteration",
                passed=False,
                failed_assertions=["Expected exit code 0, got 1", "Target stdout contains 'RSI': False"],
                tags=["quant", "rsi"],
            ),
            TraceEvent(
                timestamp="2026-09-03T10:02:00",
                task_name="Calculate RSI Indicator",
                iteration=2,
                event_type="iteration",
                passed=True,
                failed_assertions=[],
                tags=["quant", "rsi"],
            ),
        ]

        lessons = analyze_traces_for_lessons(events)
        self.assertEqual(len(lessons), 1)
        lesson = lessons[0]
        self.assertTrue(lesson.id.startswith("MEM-DREAM-"))
        self.assertIn("Calculate RSI Indicator", lesson.title)
        self.assertIn("Expected exit code 0", lesson.anti_pattern)
        self.assertIn("dream-distilled", lesson.tags)

    def test_detects_recurring_skill_patterns(self):
        events = [
            TraceEvent(
                timestamp="2026-09-03T09:00:00",
                task_name="Deploy Staging Worktree",
                iteration=1,
                event_type="iteration",
                passed=True,
                tags=["deploy", "worktree"],
            ),
            TraceEvent(
                timestamp="2026-09-03T11:00:00",
                task_name="Deploy Staging Worktree",
                iteration=1,
                event_type="iteration",
                passed=True,
                tags=["deploy", "worktree"],
            ),
        ]

        skills = detect_recurring_skill_patterns(events, min_occurrences=2)
        self.assertEqual(len(skills), 1)
        skill = skills[0]
        self.assertEqual(skill.name, "skill-deploy-staging-worktree")
        self.assertIn("worktree", skill.trigger_tags)

    def test_domain_layer_purity_ast_check(self):
        domain_files = [
            "src/bento/domain/models.py",
            "src/bento/domain/rules.py",
            "src/bento/domain/ports.py",
        ]
        violations = []
        for f in domain_files:
            content = Path(f).read_text(encoding="utf-8")
            violations.extend(validate_clean_architecture_ast(f, content))
        self.assertEqual(violations, [], f"Clean Architecture violations detected in domain: {violations}")


if __name__ == "__main__":
    unittest.main()
