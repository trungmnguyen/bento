"""Unit tests for Bento Level 4 Adversarial Self-Play Arena."""
import json
import unittest
from bento.domain.models import (
    AgentResponse,
    Assertion,
    AssertionType,
    Scenario,
    Step,
)
from bento.frameworks.agent_drivers import MockAgentDriver
from bento.use_cases.run_arena import RunArenaUseCase
from bento.use_cases.run_scenario import RunScenarioUseCase


class TestArena(unittest.TestCase):
    def test_arena_exploit_discovered_and_patched(self):
        class StateExecutionGateway:
            def __init__(self):
                self.calls = 0
            def execute_command(self, command, cwd=None, env=None, timeout_sec=30.0):
                self.calls += 1
                # Call 1 (Round 1 eval): exploit fails
                if self.calls == 1:
                    return 1, "", "ZeroDivisionError in line 5", 10.0
                # Call 2 (Round 1 patch re-verify) and subsequent: passes
                return 0, "OK", "", 10.0

        mock_exec = StateExecutionGateway()
        run_scenario_uc = RunScenarioUseCase(execution_gateway=mock_exec)

        exploit_contract = {
            "name": "Exploit Flat Market Flash Crash",
            "steps": [
                {
                    "name": "Exploit Step",
                    "command": "python3 test_exploit.py",
                    "assertions": [
                        {"type": "EXIT_CODE_EQUALS", "expected": 0, "target_field": "exit_code"}
                    ]
                }
            ]
        }
        attacker_driver = MockAgentDriver([AgentResponse(content=json.dumps(exploit_contract))])
        builder_driver = MockAgentDriver([AgentResponse(content="Patched zero division")])

        base_scenario = Scenario(
            name="Base Indicator",
            steps=[Step(name="Base", command="python3 base.py")],
        )

        arena_uc = RunArenaUseCase(
            attacker_gateway=attacker_driver,
            builder_gateway=builder_driver,
            run_scenario_use_case=run_scenario_uc,
        )

        result = arena_uc.execute(
            task_description="Build resilient indicator",
            base_scenario=base_scenario,
            rounds=2,
        )

        self.assertEqual(result.total_rounds, 2)
        self.assertEqual(result.total_exploits_found, 1)
        self.assertEqual(result.total_exploits_patched, 1)
        self.assertTrue(result.hardened)
