"""RunArenaUseCase: Coordinates Adversarial Red-Team (Attacker) vs Blue-Team (Builder) sparring loop."""
from __future__ import annotations
import json
import time
from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.domain.models import (
    AgentResponse,
    ArenaResult,
    ArenaRound,
    Scenario,
    ScenarioResult,
    StepStatus,
)
from bento.domain.ports import AgentGateway, MemoryGateway
from bento.domain.rules import (
    build_adversarial_attacker_prompt,
    build_adversarial_builder_prompt,
    synthesize_regression_scenario,
)
from bento.use_cases.distill_memory import DistillMemoryUseCase
from bento.use_cases.run_scenario import RunScenarioUseCase


class RunArenaUseCase:
    def __init__(
        self,
        attacker_gateway: AgentGateway,
        builder_gateway: AgentGateway,
        run_scenario_use_case: RunScenarioUseCase,
        memory_gateway: MemoryGateway | None = None,
    ):
        self._attacker = attacker_gateway
        self._builder = builder_gateway
        self._run_scenario = run_scenario_use_case
        self._memory = memory_gateway

    def execute(
        self,
        task_description: str,
        base_scenario: Scenario,
        rounds: int = 3,
        working_dir: str | None = None,
    ) -> ArenaResult:
        start_time = time.monotonic()
        arena_rounds: list[ArenaRound] = []
        previous_exploits: list[str] = []
        exploits_found_count = 0
        exploits_patched_count = 0
        effective_cwd = working_dir or base_scenario.working_dir

        for r in range(1, rounds + 1):
            # 1. Attacker generates adversarial contract payload
            attacker_prompt = build_adversarial_attacker_prompt(
                task_description=task_description,
                base_scenario=base_scenario,
                round_num=r,
                previous_exploits=previous_exploits,
            )
            attacker_resp = self._attacker.execute_agent_task(attacker_prompt, working_dir=effective_cwd)

            # 2. Parse attacker scenario (fallback to base scenario with fuzz params if parse fails)
            try:
                attacker_scenario = ScenarioParser.from_json(attacker_resp.content)
            except Exception:
                # If raw json was surrounded by markdown fences
                match = attacker_resp.content
                if "{" in match and "}" in match:
                    json_sub = match[match.find("{"):match.rfind("}")+1]
                    try:
                        attacker_scenario = ScenarioParser.from_json(json_sub)
                    except Exception:
                        attacker_scenario = base_scenario
                else:
                    attacker_scenario = base_scenario

            # 3. Test current code against adversarial scenario
            eval_result = self._run_scenario.execute(attacker_scenario, working_dir_override=effective_cwd)

            builder_resp = AgentResponse(content="No action needed (Code resisted attack)")
            exploit_found = False

            if not eval_result.passed:
                exploit_found = True
                exploits_found_count += 1
                previous_exploits.append(f"Round {r}: {attacker_scenario.name}")

                # 4. Builder patches the code
                builder_prompt = build_adversarial_builder_prompt(
                    task_description=task_description,
                    exploit_scenario=attacker_scenario,
                    failure_output=str(eval_result.step_results),
                )
                builder_resp = self._builder.execute_agent_task(builder_prompt, working_dir=effective_cwd)

                # Re-verify
                post_patch_eval = self._run_scenario.execute(attacker_scenario, working_dir_override=effective_cwd)
                if post_patch_eval.passed:
                    exploits_patched_count += 1
                    eval_result = post_patch_eval
                    # Save hardened test into permanent regressions
                    if self._memory:
                        self._memory.save_regression_scenario(attacker_scenario, working_dir=effective_cwd)

            round_record = ArenaRound(
                round_num=r,
                attacker_payload=attacker_resp.content,
                attacker_contract=attacker_scenario,
                builder_response=builder_resp,
                evaluation_result=eval_result,
                exploit_found=exploit_found,
            )
            arena_rounds.append(round_record)

        total_duration_ms = (time.monotonic() - start_time) * 1000.0
        hardened = (exploits_found_count == exploits_patched_count)

        return ArenaResult(
            task_name=base_scenario.name,
            rounds=arena_rounds,
            total_rounds=rounds,
            total_exploits_found=exploits_found_count,
            total_exploits_patched=exploits_patched_count,
            hardened=hardened,
            total_duration_ms=total_duration_ms,
        )
