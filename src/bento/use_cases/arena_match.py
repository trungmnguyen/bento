"""RunArenaMatchUseCase: Head-to-head contract sparring evaluation."""
from __future__ import annotations

import datetime
from bento.adapters.parsers.scenario_parser import ScenarioParser
from bento.domain.models import (
    ArenaMatchup,
    ArenaScorecard,
    ScenarioResult,
    StepStatus,
    TraceEvent,
)
from bento.domain.ports import StorageGateway, TraceGateway
from bento.use_cases.run_scenario import RunScenarioUseCase


class RunArenaMatchUseCase:
    def __init__(
        self,
        storage_gateway: StorageGateway,
        run_scenario_use_case: RunScenarioUseCase,
        trace_gateway: TraceGateway | None = None,
    ):
        self._storage = storage_gateway
        self._run_scenario = run_scenario_use_case
        self._trace = trace_gateway

    def execute(
        self,
        matchup: ArenaMatchup,
        working_dir: str | None = None,
    ) -> ArenaScorecard:
        if not self._storage.file_exists(matchup.challenger):
            raise FileNotFoundError(f"Challenger contract '{matchup.challenger}' not found.")
        if not self._storage.file_exists(matchup.defender):
            raise FileNotFoundError(f"Defender contract '{matchup.defender}' not found.")

        c_raw = self._storage.read_text(matchup.challenger)
        d_raw = self._storage.read_text(matchup.defender)

        c_scenario = ScenarioParser.from_json(c_raw)
        d_scenario = ScenarioParser.from_json(d_raw)

        c_result = self._run_scenario.execute(c_scenario, working_dir_override=working_dir)
        d_result = self._run_scenario.execute(d_scenario, working_dir_override=working_dir)

        c_passed = sum(1 for s in c_result.step_results if s.status == StepStatus.PASSED)
        c_failed = sum(1 for s in c_result.step_results if s.status != StepStatus.PASSED)
        c_total = len(c_result.step_results)
        c_duration = c_result.total_duration_ms

        d_passed = sum(1 for s in d_result.step_results if s.status == StepStatus.PASSED)
        d_failed = sum(1 for s in d_result.step_results if s.status != StepStatus.PASSED)
        d_total = len(d_result.step_results)
        d_duration = d_result.total_duration_ms

        metric = matchup.metric or "pass_rate"

        if metric == "duration":
            if c_duration < d_duration:
                winner = "challenger"
                margin = d_duration - c_duration
            elif d_duration < c_duration:
                winner = "defender"
                margin = c_duration - d_duration
            else:
                winner = "tie"
                margin = 0.0
        elif metric == "assertions":
            c_ast_passed = sum(1 for s in c_result.step_results for a in s.assertion_results if a.passed)
            d_ast_passed = sum(1 for s in d_result.step_results for a in s.assertion_results if a.passed)
            if c_ast_passed > d_ast_passed:
                winner = "challenger"
                margin = float(c_ast_passed - d_ast_passed)
            elif d_ast_passed > c_ast_passed:
                winner = "defender"
                margin = float(d_ast_passed - c_ast_passed)
            else:
                # Tie-breaker: duration
                if c_duration < d_duration:
                    winner = "challenger"
                    margin = d_duration - c_duration
                elif d_duration < c_duration:
                    winner = "defender"
                    margin = c_duration - d_duration
                else:
                    winner = "tie"
                    margin = 0.0
        else:  # default: pass_rate
            c_rate = (c_passed / c_total * 100.0) if c_total > 0 else 0.0
            d_rate = (d_passed / d_total * 100.0) if d_total > 0 else 0.0

            if c_rate > d_rate:
                winner = "challenger"
                margin = c_rate - d_rate
            elif d_rate > c_rate:
                winner = "defender"
                margin = d_rate - c_rate
            else:
                # Tie-breaker: duration
                if c_duration < d_duration:
                    winner = "challenger"
                    margin = d_duration - c_duration
                elif d_duration < c_duration:
                    winner = "defender"
                    margin = c_duration - d_duration
                else:
                    winner = "tie"
                    margin = 0.0

        scorecard = ArenaScorecard(
            challenger_name=c_scenario.name,
            defender_name=d_scenario.name,
            challenger_passed=c_passed,
            challenger_failed=c_failed,
            challenger_total_steps=c_total,
            challenger_duration_ms=c_duration,
            defender_passed=d_passed,
            defender_failed=d_failed,
            defender_total_steps=d_total,
            defender_duration_ms=d_duration,
            winner=winner,
            metric_used=metric,
            margin=margin,
            challenger_result=c_result,
            defender_result=d_result,
        )

        if self._trace:
            event = TraceEvent(
                timestamp=datetime.datetime.now().isoformat(),
                task_name=f"Arena Match: {c_scenario.name} vs {d_scenario.name}",
                iteration=1,
                event_type="arena_match",
                prompt_sent=f"bento arena --challenger {matchup.challenger} --defender {matchup.defender}",
                agent_output=f"Winner: {winner} by margin {margin:.2f} ({metric})",
                exit_code=0 if winner != "tie" else 1,
                passed=(winner == "challenger"),
                failed_assertions=[],
                tags=["arena", metric, winner],
            )
            self._trace.append_trace_event(event, working_dir=working_dir)

        return scorecard
