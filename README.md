# 🍱 Bento

> **A Clean-Architecture Harness Engineering System for Orchestration, Ground-Truth Verification, and Autonomous Closed-Loop Agent Workflows.**

Inspired by modern **Harness Engineering** paradigms (as championed by `@cyrilXBT`), **Bento** moves beyond running "naked" LLMs and untracked scripts. It provides the structured scaffolding, contracts, execution sandboxes, and deterministic verification gates necessary to govern, benchmark, and iteratively evaluate code and autonomous agents.

---

## 🌟 Key Capabilities

- 🔁 **Autonomous Closed-Loop Engine (`bento auto`):** Automatically drives the *Builder (Agent) $\leftrightarrow$ Judge (Harness)* feedback loop until 100% of assertions pass.
- 🍱 **Compartmentalized Clean Architecture:** Strict 4-layer separation (Pure Domain $ightarrow$ Use Cases $ightarrow$ Adapters $ightarrow$ Frameworks). Zero I/O in domain logic.
- 🎯 **Deterministic Ground-Truth Gates:** Native evaluators for stdout/stderr matching, exit codes, regex pattern assertions, JSON payload validation, and latency budgets.
- 📊 **Rich Multi-Format Reporting:** Instant ANSI-colored terminal summaries, exportable JSON metrics, and markdown test logs.
- 🚀 **Zero Heavy Dependencies:** Core system runs natively on Python 3.10+ standard library with pluggable gateways.

---

## 🏗️ Architecture Hierarchy

Bento enforces inward-only dependency boundaries:

```
src/bento/
├── domain/            # Tier 1: Pure Domain Logic (Models, Assertion Rules, Protocol Ports)
├── use_cases/         # Tier 2: Application Orchestration (AutoLoop, RunScenario, RunSuite)
├── adapters/          # Tier 3: Interface Adapters (Parsers, Console/JSON Presenters, CLI Controller)
└── frameworks/        # Tier 4: Frameworks & Drivers (Agent Drivers, Subprocess Executor, Git Driver, CLI)
```

For complete architectural specifications, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 🚀 Quickstart & CLI Commands

### 1. Installation (Making `bento` a CLI command)

To make the `bento` command globally available in your terminal:
```bash
cd /Users/tmnguyen/Dev/bento
pip install -e .
```
*(You can also run it directly without installing via `python3.12 -m bento.frameworks.cli`)*

---

### 2. Autonomous Closed-Loop Execution (`bento auto`)

Give Bento a task objective and a ground-truth contract. Bento will invoke the AI agent, test the code, feed errors back automatically, and commit when green:

```bash
bento auto --task examples/task_demo.md --contract examples/task_contract.json --max-iterations 5 --auto-commit
```

Output:
```
🍱 Bento Autonomous Loop: Quant Calc Signal Normalizer Contract [🎉 SUCCESS (ALL ASSERTIONS MET)]
🔄 Iterations: 2/5 completed
⏱️  Total Duration: 41.2ms
💾 Git: Changes auto-committed to repository
────────────────────────────────────────────────────────────
  [Iteration 1/5] -> ✗ FAILED
    - Failed Step: Run Normalization
      ZeroDivisionError on flat price series
  [Iteration 2/5] -> ✓ PASSED
────────────────────────────────────────────────────────────
```

---

### 3. Run a Single Verification Scenario (`bento run`)

```bash
bento run examples/basic_test.json
```

---

### 4. Run a Benchmark Suite (`bento suite`)

```bash
bento suite examples/ --name "Release Verification Suite"
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
