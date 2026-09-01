"""Unit tests for Bento Level 4 Swarm Pipeline & AST Clean Architecture Auditor."""
import unittest
from bento.domain.models import Scenario, Step, SwarmRole
from bento.domain.rules import validate_clean_architecture_ast
from bento.frameworks.agent_drivers import MockAgentDriver
from bento.use_cases.run_scenario import RunScenarioUseCase
from bento.use_cases.run_swarm import RunSwarmUseCase


class MockStorageGateway:
    def __init__(self, files: dict[str, str] | None = None):
        self.files = files or {}

    def read_text(self, path: str) -> str:
        return self.files.get(path, "")

    def write_text(self, path: str, content: str) -> None:
        self.files[path] = content

    def list_files(self, directory: str, pattern: str = "*") -> list[str]:
        return list(self.files.keys())

    def file_exists(self, path: str) -> bool:
        return path in self.files


class TestSwarm(unittest.TestCase):
    def test_swarm_pipeline_executes_all_roles(self):
        class MockExecution:
            def execute_command(self, command, cwd=None, env=None, timeout_sec=30.0):
                return 0, "OK", "", 10.0

        mock_exec = MockExecution()
        mock_storage = MockStorageGateway({
            "src/bento/domain/models.py": "x = 1\n",
        })
        mock_agent = MockAgentDriver()
        run_scenario_uc = RunScenarioUseCase(execution_gateway=mock_exec)

        swarm_uc = RunSwarmUseCase(
            swarm_gateway=mock_agent,
            run_scenario_use_case=run_scenario_uc,
            storage_gateway=mock_storage,
        )

        scenario = Scenario(name="Swarm Test", steps=[Step(name="Step 1", command="echo ok")])
        result = swarm_uc.execute(task_description="Build order router", scenario=scenario)

        self.assertTrue(result.passed)
        self.assertEqual(len(result.task_results), 4)
        roles = [t.role for t in result.task_results]
        self.assertIn(SwarmRole.ARCHITECT, roles)
        self.assertIn(SwarmRole.BUILDER, roles)
        self.assertIn(SwarmRole.AUDITOR, roles)
        self.assertIn(SwarmRole.JUDGE, roles)

    def test_clean_architecture_ast_catches_domain_violations(self):
        bad_domain_code = """
import subprocess
import os

def calculate():
    print("Violating Clean Architecture!")
    return os.getenv("API_KEY")
"""
        violations = validate_clean_architecture_ast("src/my_app/domain/logic.py", bad_domain_code)
        self.assertGreater(len(violations), 0)
        self.assertTrue(any("subprocess" in v for v in violations))
        self.assertTrue(any("print()" in v for v in violations))
