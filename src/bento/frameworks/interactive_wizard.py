"""InteractiveContractWizard: Interactive terminal wizard for scaffolding verification contracts (Bento Origami)."""
from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Any

from bento.domain.models import Assertion, AssertionType, Scenario, Step
from bento.domain.ports import ExecutionGateway, StorageGateway
from bento.domain.rules import evaluate_assertion, validate_scenario
from bento.adapters.parsers.scenario_parser import ScenarioParser


class InteractiveContractWizard:
    def __init__(self, execution_gateway: ExecutionGateway, storage_gateway: StorageGateway):
        self._execution_gateway = execution_gateway
        self._storage_gateway = storage_gateway

    def run_interactive(self, output_dir: str = "benchmarks", dry_run: bool = True) -> int:
        print("\n🍱 BENTO ORIGAMI: Interactive Contract Scaffolding Wizard")
        print("─────────────────────────────────────────────────────────────────")
        print("Craft deterministic ground-truth contracts directly in your terminal.\n")

        # 1. Flight Name
        raw_name = input("🥢 Contract / Flight Name [e.g. ast_purity_gate]: ").strip()
        if not raw_name:
            raw_name = "custom_contract"
        name = re.sub(r"[^a-zA-Z0-9_\-]", "_", raw_name).lower()

        # 2. Description
        description = input("📝 Description: ").strip()
        if not description:
            description = f"Deterministic ground-truth contract for {name}"

        # 3. Tags
        raw_tags = input("🏷️  Tags (comma-separated) [e.g. contract,gate,ci]: ").strip()
        tags = [t.strip() for t in raw_tags.split(",") if t.strip()] if raw_tags else ["contract"]

        # 4. Step Builder Loop
        steps: list[Step] = []
        step_idx = 1
        while True:
            print(f"\n─── Step #{step_idx} ───")
            step_name = input(f"Step Name [step_{step_idx}]: ").strip() or f"step_{step_idx}"
            command = input("Shell Command: ").strip()
            while not command:
                print("  Command cannot be empty.")
                command = input("Shell Command: ").strip()

            timeout_input = input("Timeout in seconds [30.0]: ").strip()
            try:
                timeout_sec = float(timeout_input) if timeout_input else 30.0
            except ValueError:
                timeout_sec = 30.0

            # Assertion Selection
            print("\nChoose Contract Assertion Preset:")
            print("  [1] Clean Exit: exit_code == 0 (Default)")
            print("  [2] Output Pattern: stdout CONTAINS <text>")
            print("  [3] Absence Guard: stderr NOT_CONTAINS <text>")
            print("  [4] Clean Architecture Purity: stdout CONTAINS '100% PURE DOMAIN VERIFIED'")
            print("  [5] Custom Assertion")
            choice = input("Select preset [1-5, default: 1]: ").strip() or "1"

            assertions: list[Assertion] = []
            if choice == "1":
                assertions.append(
                    Assertion(
                        type=AssertionType.EXIT_CODE_EQUALS,
                        expected=0,
                        target_field="exit_code",
                        description="Process exits with returncode 0",
                    )
                )
            elif choice == "2":
                pattern = input("Expected text in stdout: ").strip()
                assertions.append(
                    Assertion(
                        type=AssertionType.CONTAINS,
                        expected=pattern,
                        target_field="stdout",
                        description=f"stdout contains '{pattern}'",
                    )
                )
            elif choice == "3":
                pattern = input("Disallowed text in stderr: ").strip()
                assertions.append(
                    Assertion(
                        type=AssertionType.NOT_CONTAINS,
                        expected=pattern,
                        target_field="stderr",
                        description=f"stderr does not contain '{pattern}'",
                    )
                )
            elif choice == "4":
                assertions.append(
                    Assertion(
                        type=AssertionType.CONTAINS,
                        expected="100% PURE DOMAIN VERIFIED",
                        target_field="stdout",
                        description="Domain layer enforces 100% AST purity",
                    )
                )
            elif choice == "5":
                a_type_str = input("Assertion Type [CONTAINS/EQUALS/NOT_CONTAINS/REGEX/EXIT_CODE_EQUALS]: ").strip().upper()
                try:
                    a_type = AssertionType(a_type_str)
                except ValueError:
                    a_type = AssertionType.CONTAINS
                target_field = input("Target field [stdout/stderr/exit_code]: ").strip() or "stdout"
                expected_val: Any = input("Expected value: ").strip()
                if a_type == AssertionType.EXIT_CODE_EQUALS:
                    try:
                        expected_val = int(expected_val)
                    except ValueError:
                        expected_val = 0
                assertions.append(
                    Assertion(
                        type=a_type,
                        expected=expected_val,
                        target_field=target_field,
                        description=f"{target_field} [{a_type.value}] {expected_val}",
                    )
                )

            step = Step(
                name=step_name,
                command=command,
                timeout_sec=timeout_sec,
                assertions=assertions,
            )

            # Dry-Run Preflight Tasting in Terminal
            if dry_run:
                print("\n  ⚡ Running Pre-Flight Taste in terminal sandbox...")
                try:
                    exit_code, stdout, stderr, dur_ms = self._execution_gateway.execute_command(
                        command=command,
                        timeout_sec=timeout_sec,
                    )
                    out_data = {
                        "stdout": stdout,
                        "stderr": stderr,
                        "exit_code": exit_code,
                        "duration_ms": dur_ms,
                    }
                    all_passed = True
                    for a in assertions:
                        res = evaluate_assertion(a, out_data)
                        if res.passed:
                            print(f"     ✓ [PASS] {a.description or a.type.value} ({dur_ms:.1f}ms)")
                        else:
                            all_passed = False
                            print(f"     ✗ [FAIL] {res.message}")
                    if all_passed:
                        print("     🍵 Pre-Flight Taste Satisfied 100%!")
                except Exception as e:
                    print(f"     ✗ [ERROR] Pre-flight failed: {e}")

            steps.append(step)

            add_more = input("\nAdd another step to this flight? [y/N]: ").strip().lower()
            if add_more != "y":
                break
            step_idx += 1

        scenario = Scenario(
            name=name,
            description=description,
            tags=tags,
            steps=steps,
        )

        validation_errors = validate_scenario(scenario)
        if validation_errors:
            print("\n❌ Contract Validation Failed:")
            for err in validation_errors:
                print(f"  • {err}")
            return 1

        # 5. Persist to Output Directory
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        file_path = out_path / f"{name}.json"

        if file_path.exists():
            overwrite = input(f"\n⚠️  {file_path} already exists. Overwrite? [y/N]: ").strip().lower()
            if overwrite != "y":
                print("Aborted.")
                return 0

        self._storage_gateway.write_text(str(file_path), ScenarioParser.to_json(scenario))
        print("\n✨ Contract Flight Saved!")
        print(f"   📁 File:    {file_path}")
        print(f"   🥢 Execute: bento run {file_path}")
        print("─────────────────────────────────────────────────────────────────\n")
        return 0
