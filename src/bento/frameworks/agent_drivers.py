"""Concrete Agent Driver Gateways for Bento.

Provides adapters for Claude Code, Gemini CLI/API, Swarm dispatchers, and testing mocks.
"""
from __future__ import annotations
import os
import subprocess
from typing import Callable
from bento.domain.models import AgentResponse, SwarmRole
from bento.domain.ports import AgentGateway, SwarmGateway


class ClaudeCodeDriver(AgentGateway):
    """Invokes Claude Code CLI in headless non-interactive print mode."""
    def __init__(self, claude_binary: str = "claude"):
        self.claude_binary = claude_binary

    def execute_agent_task(self, prompt: str, working_dir: str | None = None) -> AgentResponse:
        cmd = [self.claude_binary, "-p", prompt]
        try:
            res = subprocess.run(
                cmd,
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=180.0,
            )
            return AgentResponse(
                content=res.stdout or "",
                exit_code=res.returncode,
                raw_output=res.stdout + "\n" + res.stderr,
            )
        except Exception as e:
            return AgentResponse(content="", exit_code=-1, raw_output=str(e))


class GenericCommandDriver(AgentGateway):
    """Invokes a customizable shell command template with prompt input."""
    def __init__(self, command_template: str = "python3 agent_worker.py"):
        self.command_template = command_template

    def execute_agent_task(self, prompt: str, working_dir: str | None = None) -> AgentResponse:
        env = os.environ.copy()
        env["BENTO_PROMPT"] = prompt
        try:
            res = subprocess.run(
                self.command_template,
                shell=True,
                cwd=working_dir,
                env=env,
                capture_output=True,
                text=True,
                timeout=180.0,
            )
            return AgentResponse(
                content=res.stdout or "",
                exit_code=res.returncode,
                raw_output=res.stdout + "\n" + res.stderr,
            )
        except Exception as e:
            return AgentResponse(content="", exit_code=-1, raw_output=str(e))


class MockAgentDriver(AgentGateway, SwarmGateway):
    """In-memory deterministic mock agent for unit & integration tests."""
    def __init__(
        self,
        responses: list[AgentResponse] | None = None,
        side_effect: Callable | None = None,
    ):
        self.responses = list(responses or [AgentResponse(content="mock edit done")])
        self.side_effect = side_effect
        self.prompts_received: list[str] = []

    def execute_agent_task(self, prompt: str, working_dir: str | None = None) -> AgentResponse:
        self.prompts_received.append(prompt)
        if self.side_effect:
            self.side_effect(prompt, working_dir)
        if self.responses:
            return self.responses.pop(0) if len(self.responses) > 1 else self.responses[0]
        return AgentResponse(content="OK")

    def execute_role(self, role: SwarmRole, prompt: str, working_dir: str | None = None) -> AgentResponse:
        self.prompts_received.append(f"[{role.value}] {prompt}")
        if self.side_effect:
            self.side_effect(prompt, working_dir)
        return AgentResponse(content=f"Completed {role.value} task successfully.")


class SwarmDispatcherDriver(SwarmGateway):
    """Dispatches role tasks to Claude Code with specialized role prompts."""
    def __init__(self, base_driver: AgentGateway):
        self._driver = base_driver

    def execute_role(self, role: SwarmRole, prompt: str, working_dir: str | None = None) -> AgentResponse:
        role_prompts = {
            SwarmRole.ARCHITECT: "You are the Principal Architect. Analyze requirements, define pure interfaces, and output Clean Architecture plan.",
            SwarmRole.BUILDER: "You are the Senior Builder. Implement pure domain logic and adapters with zero side effects.",
            SwarmRole.AUDITOR: "You are the Lead Auditor. Check Clean Architecture constraints and assert zero I/O in domain.",
            SwarmRole.JUDGE: "You are the Verifier Judge. Execute test scenarios against ground-truth contracts.",
        }
        preamble = role_prompts.get(role, "You are a specialized agent.")
        full_prompt = f"{preamble}\n\nTASK:\n{prompt}"
        return self._driver.execute_agent_task(full_prompt, working_dir=working_dir)
