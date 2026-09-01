"""EvaluateOutputUseCase: Direct assertion checking against raw structured data (Judge contract)."""
from __future__ import annotations
from typing import Any
from bento.domain.models import Assertion, AssertionResult
from bento.domain.rules import evaluate_assertion


class EvaluateOutputUseCase:
    def execute(self, assertions: list[Assertion], output_data: dict[str, Any]) -> list[AssertionResult]:
        return [evaluate_assertion(a, output_data) for a in assertions]
