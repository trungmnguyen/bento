"""Unit tests for OrchestraSprintUseCase and Bento Orchestra CLI."""
import json
import unittest

from bento.adapters.controllers.cli_controller import CliController
from bento.adapters.presenters.console_presenter import ConsolePresenter
from bento.domain.models import (
    BrigadeRole,
    BrigadeStageResult,
    MemoryBank,
    MemoryLesson,
    OrchestraSprintResult,
    Scenario,
    ScenarioResult,
    Step,
    StepResult,
    StepStatus,
    SuiteResult,
    TraceEvent,
    TriadRole,
    TriadStageResult,
)
from bento.use_cases.orchestra_sprint import OrchestraSprintUseCase


class MockStorageGateway:
    def __init__(self, files: dict[str, str] | None = None):
        self.files = files or {}

    def read_text(self, path: str) -> str:
        return self.files.get(path, "")

    def write_text(self, path: str, content: str) -> None:
        self.files[path] = content

    def file_exists(self, path: str) -> bool:
        return path in self.files

    def list_files(self, directory: str, pattern: str = "*") -> list[str]:
        if pattern == "src/**/*.py":
            return [f for f in self.files.keys() if f.startswith("src/") and f.endswith(".py")]
        return [f for f in self.files.keys() if f.startswith(directory)]


class MockMemoryGateway:
    def __init__(self, lessons: list[MemoryLesson] | None = None):
        self.memory = MemoryBank(lessons=lessons or [])

    def load_memory(self, working_dir=None) -> MemoryBank:
        return self.memory

    def save_memory(self, memory: MemoryBank, working_dir=None) -> None:
        self.memory = memory


class MockTraceGateway:
    def __init__(self):
        self.traces = []

    def append_trace_event(self, event: TraceEvent, working_dir=None) -> None:
        self.traces.append(event)


class MockRunScenarioUseCase:
    def __init__(self, pass_scenario: bool = True):
        self.pass_scenario = pass_scenario

    def execute(self, scenario, working_dir_override=None):
        return ScenarioResult(
            scenario_name=scenario.name,
            status=StepStatus.PASSED if self.pass_scenario else StepStatus.FAILED,
            step_results=[
                StepResult(
                    step_name="test_step",
                    command="echo 1",
                    status=StepStatus.PASSED if self.pass_scenario else StepStatus.FAILED,
                    exit_code=0 if self.pass_scenario else 1,
                    stdout="1" if self.pass_scenario else "",
                    stderr="" if self.pass_scenario else "error",
                    assertion_results=[],
                    duration_ms=10.0,
                    error_message=None if self.pass_scenario else "Step assertion failed",
                )
            ],
            total_duration_ms=10.0,
        )


class MockRunSuiteUseCase:
    def __init__(self, all_passed: bool = True):
        self.all_passed = all_passed

    def execute(self, scenarios, suite_name=""):
        passed_count = len(scenarios) if self.all_passed else max(0, len(scenarios) - 1)
        failed_count = len(scenarios) - passed_count
        return SuiteResult(
            suite_name=suite_name,
            total_scenarios=len(scenarios),
            passed_scenarios=passed_count,
            failed_scenarios=failed_count,
            total_duration_ms=25.0,
            scenario_results=[
                ScenarioResult(
                    scenario_name=s.name,
                    status=StepStatus.PASSED,
                    step_results=[],
                    total_duration_ms=5.0,
                )
                for s in scenarios
            ],
        )


class TestOrchestraSprint(unittest.TestCase):
    def setUp(self):
        self.clean_py_file = "src/bento/domain/pure_math.py"
        self.clean_py_code = '"""Pure math domain."""\ndef add(a: int, b: int) -> int:\n    return a + b\n'
        self.storage = MockStorageGateway(files={self.clean_py_file: self.clean_py_code})
        self.run_scenario = MockRunScenarioUseCase(pass_scenario=True)
        self.run_suite = MockRunSuiteUseCase(all_passed=True)
        self.memory = MockMemoryGateway(
            lessons=[
                MemoryLesson(id="MEM-01", title="Pure Domain", category="architecture", context="c", rule="r")
            ]
        )
        self.trace = MockTraceGateway()

        self.use_case = OrchestraSprintUseCase(
            storage_gateway=self.storage,
            run_scenario_use_case=self.run_scenario,
            run_suite_use_case=self.run_suite,
            memory_gateway=self.memory,
            trace_gateway=self.trace,
        )

    def test_orchestra_sprint_all_passed(self):
        scenario = Scenario(name="smoke_test", steps=[Step(name="s1", command="echo 1")])
        result = self.use_case.execute(rounds=2, target_scenario=scenario)

        self.assertEqual(result.total_rounds, 2)
        self.assertTrue(result.all_passed)
        self.assertEqual(len(result.rounds), 2)
        for r in result.rounds:
            self.assertTrue(r.passed)
            self.assertEqual(len(r.stage_results), 5)
            roles = [s.role for s in r.stage_results]
            self.assertEqual(roles, [BrigadeRole.WASABI, BrigadeRole.YUZU, BrigadeRole.MATCHA, BrigadeRole.PATRON, BrigadeRole.CHEF])
            # Backwards compatibility check
            self.assertEqual(roles, [TriadRole.WASABI, TriadRole.YUZU, TriadRole.MATCHA, TriadRole.PATRON, TriadRole.CHEF])
            self.assertIs(TriadRole, BrigadeRole)
            self.assertIs(TriadStageResult, BrigadeStageResult)

        # Verify traces were recorded (Wasabi audit + Yuzu A11y + Chef scenario + Round summary = 4 per round)
        self.assertEqual(len(self.trace.traces), 8)
        task_names = [t.task_name for t in self.trace.traces]
        self.assertIn("Triad Audit: AST Purity & Architectural Invariants", task_names)
        self.assertIn("Triad Audit: UI Accessibility & Visual Invariants", task_names)
        self.assertIn("smoke_test", task_names)
        self.assertIn("orchestra_round_1", task_names)
        self.assertIn("orchestra_round_2", task_names)

    def test_orchestra_wasabi_ast_violation_blocks_patron_gate(self):
        # Inject AST violation in domain layer
        leak_file = "src/bento/domain/leaky.py"
        leak_code = 'import subprocess\ndef leak(): subprocess.run("ls")\n'
        self.storage.files[leak_file] = leak_code

        # Without auto-approve, Patron gate should block
        result = self.use_case.execute(rounds=1, auto_approve=False)
        self.assertFalse(result.all_passed)
        self.assertFalse(result.rounds[0].passed)

        wasabi_stage = result.rounds[0].stage_results[0]
        self.assertEqual(wasabi_stage.role, TriadRole.WASABI)
        self.assertFalse(wasabi_stage.passed)
        self.assertGreater(wasabi_stage.findings_count, 0)

        patron_stage = result.rounds[0].stage_results[3]
        self.assertEqual(patron_stage.role, TriadRole.PATRON)
        self.assertFalse(patron_stage.passed)
        self.assertIn("Blocked", patron_stage.output_summary)

    def test_orchestra_wasabi_ast_violation_with_auto_approve(self):
        # Inject AST violation
        leak_file = "src/bento/domain/leaky.py"
        leak_code = 'import os\ndef leak(): os.system("ls")\n'
        self.storage.files[leak_file] = leak_code

        # With auto-approve, Patron gate overrides
        result = self.use_case.execute(rounds=1, auto_approve=True)
        patron_stage = result.rounds[0].stage_results[3]
        self.assertTrue(patron_stage.passed)
        self.assertIn("Overridden", patron_stage.output_summary)

    def test_orchestra_yuzu_a11y_violations(self):
        a11y_finding = ["Button missing aria-label (WCAG 4.1.2)"]
        res = self.use_case.execute(rounds=1, auto_approve=False, a11y_findings=a11y_finding)
        self.assertFalse(res.all_passed)
        yuzu_stage = res.rounds[0].stage_results[1]
        self.assertEqual(yuzu_stage.role, TriadRole.YUZU)
        self.assertFalse(yuzu_stage.passed)
        self.assertEqual(yuzu_stage.findings_count, 1)

        yuzu_traces = [t for t in self.trace.traces if t.event_type == "yuzu_audit"]
        self.assertEqual(len(yuzu_traces), 1)
        self.assertFalse(yuzu_traces[0].passed)
        self.assertEqual(yuzu_traces[0].failed_assertions, a11y_finding)

    def test_orchestra_audit_to_trace_dream_harvest(self):
        from bento.domain.rules import analyze_traces_for_lessons

        # Round 1: Inject AST violation in domain layer
        leak_file = "src/bento/domain/leaky.py"
        self.storage.files[leak_file] = 'import subprocess\ndef leak(): subprocess.run("ls")\n'

        # Execute Round 1 with auto_approve (Wasabi flags violation, emits failing audit trace)
        res1 = self.use_case.execute(rounds=1, auto_approve=True)
        self.assertFalse(res1.all_passed)

        wasabi_traces_r1 = [t for t in self.trace.traces if t.event_type == "wasabi_audit"]
        self.assertEqual(len(wasabi_traces_r1), 1)
        self.assertFalse(wasabi_traces_r1[0].passed)
        self.assertGreater(len(wasabi_traces_r1[0].failed_assertions), 0)

        # Round 2: Blue Team remediates the violation
        self.storage.files[leak_file] = '"""Pure domain code."""\ndef pure_func(): return 42\n'

        # Execute Round 2
        res2 = self.use_case.execute(rounds=2, auto_approve=True)

        # Run analyze_traces_for_lessons to verify Dream engine harvesting
        harvested = analyze_traces_for_lessons(self.trace.traces)

        self.assertGreaterEqual(len(harvested), 1)
        audit_lesson = next((l for l in harvested if "AST Purity" in l.title), None)
        self.assertIsNotNone(audit_lesson)
        self.assertTrue(audit_lesson.id.startswith("MEM-DREAM-"))
        self.assertIn("subprocess", audit_lesson.rule)
        self.assertIn("harness-recovery", audit_lesson.tags)
        self.assertIn("red_team", audit_lesson.tags)

    def test_orchestra_adversarial_findings_trace(self):
        findings = ["CORS DNS Rebinding allowed on /api/memory/export"]
        res = self.use_case.execute(rounds=1, auto_approve=True, adversarial_findings=findings)
        wasabi_traces = [t for t in self.trace.traces if t.event_type == "wasabi_audit"]
        self.assertEqual(len(wasabi_traces), 1)
        self.assertFalse(wasabi_traces[0].passed)
        self.assertEqual(wasabi_traces[0].failed_assertions, findings)

    def test_cli_controller_handle_orchestra(self):
        presenter = ConsolePresenter(use_color=False)
        controller = CliController(
            run_scenario_use_case=self.run_scenario,
            run_suite_use_case=self.run_suite,
            storage_gateway=self.storage,
            presenter=presenter,
            memory_gateway=self.memory,
            trace_gateway=self.trace,
        )

        exit_code, output = controller.handle_orchestra(rounds=1, auto_approve=True)
        self.assertEqual(exit_code, 0)
        self.assertIn("BENTO ORCHESTRA", output)
        self.assertIn("Red Team Auditor (Spicy Wasabi)", output)
        self.assertIn("Yellow Team Auditor (Yuzu Sensory)", output)
        self.assertIn("Green Team Innovator (Matcha Master)", output)
        self.assertIn("Patron Gate Reviewer (Bento Patron)", output)
        self.assertIn("Blue Team Craftsman (Executive Chef)", output)

    def test_cli_controller_handle_orchestra_json(self):
        presenter = ConsolePresenter(use_color=False)
        controller = CliController(
            run_scenario_use_case=self.run_scenario,
            run_suite_use_case=self.run_suite,
            storage_gateway=self.storage,
            presenter=presenter,
            memory_gateway=self.memory,
            trace_gateway=self.trace,
        )

        exit_code, output = controller.handle_orchestra(rounds=1, auto_approve=True, json_output=True)
        self.assertEqual(exit_code, 0)
        data = json.loads(output)
        self.assertEqual(data["sprint_name"], "Bento Culinary Brigade Orchestra")
        self.assertEqual(data["total_rounds"], 1)
        self.assertTrue(data["all_passed"])

    def test_orchestra_auto_dream_consolidation(self):
        from bento.domain.models import DreamCycleResult, SuiteResult

        class MockDreamCycleUseCase:
            def __init__(self):
                self.called = False

            def execute(self, benchmarks_dir, working_dir=None, harvest_traces=True):
                self.called = True
                return DreamCycleResult(
                    consolidated_lessons_count=13,
                    new_lessons_discovered=2,
                    suite_result=SuiteResult(
                        suite_name="Mock Battery",
                        total_scenarios=1,
                        passed_scenarios=1,
                        failed_scenarios=0,
                        total_duration_ms=10.0,
                        scenario_results=[],
                    ),
                    total_duration_ms=15.0,
                    crystallized_skills=[],
                )

        mock_dream = MockDreamCycleUseCase()
        use_case_with_dream = OrchestraSprintUseCase(
            storage_gateway=self.storage,
            run_scenario_use_case=self.run_scenario,
            run_suite_use_case=self.run_suite,
            memory_gateway=self.memory,
            trace_gateway=self.trace,
            dream_cycle_use_case=mock_dream,
        )

        # 1. Default dream=True triggers dream consolidation
        result = use_case_with_dream.execute(rounds=1, auto_approve=True, dream=True)
        self.assertTrue(mock_dream.called)
        self.assertIsNotNone(result.dream_result)
        self.assertEqual(result.dream_result.new_lessons_discovered, 2)

        # 2. dream=False skips dream consolidation
        mock_dream.called = False
        result_no_dream = use_case_with_dream.execute(rounds=1, auto_approve=True, dream=False)
        self.assertFalse(mock_dream.called)
        self.assertIsNone(result_no_dream.dream_result)


if __name__ == "__main__":
    unittest.main()
