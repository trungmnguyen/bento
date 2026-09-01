# 🍱 Bento

> **A Clean-Architecture Harness Engineering System for Orchestration, Ground-Truth Verification, and Closed-Loop Agent Workflows.**

Inspired by modern **Harness Engineering** paradigms (as championed by `@cyrilXBT`), **Bento** moves beyond running "naked" LLMs and untracked scripts. It provides the structured scaffolding, contracts, execution sandboxes, and deterministic verification gates necessary to govern, benchmark, and iteratively evaluate code and autonomous agents.

---

## 🌟 Key Capabilities

- 🍱 **Compartmentalized Clean Architecture:** Strict 4-layer separation (Pure Domain $ightarrow$ Use Cases $ightarrow$ Adapters $ightarrow$ Frameworks). Zero I/O in domain logic.
- 🔁 **Closed-Loop Verification Machinery:** Wraps raw generation into a *Builder $ightarrow$ Executor $ightarrow$ Judge* evaluation loop.
- 🎯 **Deterministic Ground-Truth Gates:** Native evaluators for stdout/stderr matching, exit codes, regex pattern assertions, JSON payload validation, and latency budgets.
- 📊 **Rich Multi-Format Reporting:** Instant ANSI-colored terminal summaries, exportable JSON metrics, and markdown test logs.
- 🚀 **Zero Heavy Dependencies:** Core system runs natively on Python 3.10+ standard library with pluggable gateways.

---

## 🏗️ Architecture Hierarchy

Bento enforces inward-only dependency boundaries:

```
src/bento/
├── domain/            # Tier 1: Pure Domain Logic (Models, Assertion Rules, Protocol Ports)
├── use_cases/         # Tier 2: Application Orchestration (RunScenario, RunSuite, Evaluate)
├── adapters/          # Tier 3: Interface Adapters (Parsers, Console/JSON Presenters, CLI Controller)
└── frameworks/        # Tier 4: Frameworks & Drivers (Subprocess Executor, FS Storage, CLI Entrypoint)
```

For complete architectural specifications, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 🚀 Quickstart

### 1. Installation

Editable local install:
```bash
cd /Users/tmnguyen/Dev/bento
pip install -e .
```

### 2. Run a Single Verification Scenario

```bash
bento run examples/basic_test.json
```

Output:
```
🍱 Bento Harness Run: Core System Health Check [PASS]
⏱️  Total Duration: 38.4ms
────────────────────────────────────────────────────────────
  Step 1: Python 3 Availability -> ✓ PASSED (15.9ms)
    Command: python3 --version
      ├─ ✓ Exit code is 0: Expected exit code 0, got 0
      ├─ ✓ Standard output contains Python 3 version: Target 'stdout' contains 'Python 3.': True
  Step 2: JSON Output Evaluation -> ✓ PASSED (22.3ms)
    Command: python3 -c "import json; print(json.dumps({'status': 'ok', 'score': 99}))"
      ├─ ✓ JSON payload has status key: Key 'status' found in JSON output: True
      ├─ ✓ Score value present: Target 'stdout' contains '99': True
────────────────────────────────────────────────────────────
```

### 3. Run a Benchmark Suite

```bash
bento suite examples/ --name "Release Verification Suite"
```

### 4. Scaffold a New Scenario

```bash
bento init my_scenario.json
```

---

## 📝 Authoring Scenario Contracts

Scenarios are defined in declarative JSON:

```json
{
  "name": "Agent Code-Gen Verification Rig",
  "description": "Closed-loop verification against ground-truth contracts",
  "tags": ["eval", "agent-loop"],
  "steps": [
    {
      "name": "Synthesize Factorial Function",
      "command": "python3 -c "import math; print(math.factorial(6))"",
      "timeout_sec": 5,
      "assertions": [
        {
          "type": "EQUALS",
          "expected": "720",
          "target_field": "stdout",
          "description": "Ground-truth contract: math.factorial(6) == 720"
        },
        {
          "type": "MAX_DURATION_MS",
          "expected": 500,
          "target_field": "duration_ms",
          "description": "Latency ceiling <= 500ms"
        }
      ]
    }
  ]
}
```

### Supported Assertion Types

| Assertion Type | Target Fields | Description |
| :--- | :--- | :--- |
| `EQUALS` | `stdout`, `stderr`, `exit_code` | Exact trimmed string or numeric match |
| `CONTAINS` | `stdout`, `stderr` | Substring inclusion check |
| `NOT_CONTAINS` | `stdout`, `stderr` | Substring exclusion check |
| `MATCHES_REGEX` | `stdout`, `stderr` | Regex pattern matching |
| `EXIT_CODE_EQUALS`| `exit_code` | Process return code verification |
| `JSON_KEY_EXISTS`| `stdout` | Validates JSON structure and presence of target key |
| `MAX_DURATION_MS`| `duration_ms` | Execution time threshold check |

---

## 🧪 Running Tests

```bash
PYTHONPATH=src python3.12 -m unittest discover -s tests -v
```

---

## 🔒 Security & Git Hygiene

- Pre-configured `.gitignore` prevents leaks of API keys, `.env*`, and platform-specific metadata (`GoogleService-Info.plist`, `xcuserdata/`).
- Logic is pure and decoupled from I/O.
