"""ScenarioParser: Translates JSON/dict payloads into pure Domain entities."""
from __future__ import annotations
import json
from typing import Any
from bento.domain.models import Assertion, AssertionType, Scenario, Step


class ScenarioParser:
    @staticmethod
    def from_dict(data: dict[str, Any]) -> Scenario:
        steps_raw = data.get("steps", [])
        steps: list[Step] = []

        for s_data in steps_raw:
            assertions_raw = s_data.get("assertions", [])
            assertions: list[Assertion] = []

            for a_data in assertions_raw:
                a_type_str = a_data.get("type", "EQUALS").upper()
                try:
                    a_type = AssertionType(a_type_str)
                except ValueError:
                    a_type = AssertionType.EQUALS

                assertions.append(
                    Assertion(
                        type=a_type,
                        expected=a_data.get("expected"),
                        target_field=a_data.get("target_field", "stdout"),
                        description=a_data.get("description", ""),
                    )
                )

            steps.append(
                Step(
                    name=s_data.get("name", "Unnamed Step"),
                    command=s_data.get("command", ""),
                    cwd=s_data.get("cwd"),
                    env=s_data.get("env", {}),
                    timeout_sec=float(s_data.get("timeout_sec", 30.0)),
                    assertions=assertions,
                    max_retries=int(s_data.get("max_retries", 0)),
                    feedback_template=s_data.get("feedback_template", ""),
                )
            )

        return Scenario(
            name=data.get("name", "Unnamed Scenario"),
            description=data.get("description", ""),
            tags=data.get("tags", []),
            working_dir=data.get("working_dir"),
            steps=steps,
            max_loop_iterations=int(data.get("max_loop_iterations", 1)),
            metadata=data.get("metadata", {}),
        )

    @classmethod
    def from_json(cls, json_str: str) -> Scenario:
        data = json.loads(json_str)
        return cls.from_dict(data)

    @classmethod
    def to_dict(cls, scenario: Scenario) -> dict[str, Any]:
        return {
            "name": scenario.name,
            "description": scenario.description,
            "tags": scenario.tags,
            "working_dir": scenario.working_dir,
            "max_loop_iterations": scenario.max_loop_iterations,
            "metadata": scenario.metadata,
            "steps": [
                {
                    "name": s.name,
                    "command": s.command,
                    "cwd": s.cwd,
                    "env": s.env,
                    "timeout_sec": s.timeout_sec,
                    "max_retries": s.max_retries,
                    "feedback_template": s.feedback_template,
                    "assertions": [
                        {
                            "type": a.type.value if hasattr(a.type, "value") else str(a.type),
                            "expected": a.expected,
                            "target_field": a.target_field,
                            "description": a.description,
                        }
                        for a in s.assertions
                    ],
                }
                for s in scenario.steps
            ],
        }

    @classmethod
    def to_json(cls, scenario: Scenario, indent: int = 2) -> str:
        return json.dumps(cls.to_dict(scenario), indent=indent)

