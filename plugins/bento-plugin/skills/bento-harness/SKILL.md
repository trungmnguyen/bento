---
name: bento-harness
description: >-
  Autonomous Harness Engineering assistant (The Brain & Butler). Use to run Bento CLI commands directly from chat,
  execute background testing daemons (bento bg), run closed-loop self-healing (bento auto), query and persist
  architectural memory (bento memory), trigger dream cycles (bento dream), launch live web & terminal telemetry (bento ui / bento monitor), and conduct adversarial red-team sparring (bento arena).
---

# 🍱 Bento Harness Engineering: The Brain & Butler Runbook

Bento is a deterministic harness engineering and memory system built with Clean Architecture.
It functions as both the **Brain** (institutional memory, guardrails, and knowledge synthesis) and the **Butler** (ambient background execution valet and testing daemon).

As an AI agent, you interact with Bento directly via terminal CLI commands (`bento <subcommand>`) using `run_command`.

---

## ⚡ Command Quick Reference

| Task | Command |
| :--- | :--- |
| **Inspect Memory Bank** | `bento memory list` |
| **Add Architectural Rule** | `bento memory add --title "..." --rule "..." [--anti-pattern "..."]` |
| **Verify Single Contract** | `bento run <contract.json> [--verbose]` |
| **Run Scenario Suite** | `bento suite <directory> [--name "..."]` |
| **Dispatch Background Task** | `bento bg run "<command>" --tag "<tag>"` |
| **List Background Tasks** | `bento bg list` |
| **Task Status & Health** | `bento bg status <task_id>` |
| **Inspect Task Logs** | `bento bg logs <task_id> -n 50` |
| **Terminate Background Task** | `bento bg kill <task_id>` |
| **Closed-Loop Self-Healing** | `bento auto --task <task.md> --contract <contract.json>` |
| **Adversarial Red-Teaming** | `bento arena --task <task.md> --contract <contract.json> --rounds 3` |
| **Multi-Agent Swarm** | `bento swarm --task <task.md> --contract <contract.json>` |
| **Overnight Dream Cycle** | `bento dream [--benchmarks <dir>] [--harvest]` |
| **Live Web UI** | `bento ui --network --no-browser --port 8765` |
| **Terminal Telemetry** | `bento monitor --port 8765` |

---

## 🎩 1. The Butler: Background Operations (`bento bg`)

When running tasks taking >10 seconds (e.g. self-healing, dream cycles, test suites), **never block interactive chat**. Dispatch the task to the Butler background runner:

```bash
# Start an auto-healing loop in background
bento bg run "bento auto --task task.md --contract contract.json --max-iterations 5" --tag "auto-heal"

# Run an overnight dream cycle in background
bento bg run "bento dream --benchmarks examples/" --tag "dream"
```

### Monitoring Background Tasks
```bash
# List all active & past background tasks
bento bg list

# Inspect real-time stdout/stderr logs
bento bg logs <task_id> -n 50

# Check process exit code & execution status
bento bg status <task_id>

# Terminate task if taking too long or diverging
bento bg kill <task_id>
```

---

## 🧠 2. The Brain: Lifelong Memory & Guardrails (`bento memory`)

Before writing trading strategies, mathematical algorithms, or Clean Architecture code, **always query Bento's memory bank** to load domain-specific axioms and anti-patterns.

### Querying Memory Bank
```bash
bento memory list
```

### Adding New Architectural Guardrails & Anti-Patterns
When discovering recurring bugs or establishing architectural patterns:
```bash
bento memory add \
  --title "Clean Architecture Boundary" \
  --rule "Domain layer must never import I/O, subprocess, or network packages." \
  --anti-pattern "Calling print() or logging inside pure mathematical calculators." \
  --category "architecture" \
  --tags "clean-code,domain,ast"
```

---

## 🌙 3. Autonomous Dream Cycle (`bento dream`)

The Dream Cycle harvests historical traces from `.bento/traces/`, synthesizes lessons learned from test runs and auto-heals, crystallizes them into skills in `.bento/skills/`, and verifies memory consistency against benchmarks.

```bash
# Full dream cycle with trace harvesting and benchmark sparring
bento dream --benchmarks examples/ --harvest
```

---

## 🎯 4. Ground-Truth Verification Contracts (`bento run` / `bento suite`)

Bento executes deterministic contract files (`scenario.json`) to verify code without hallucination.

### Structure of a Scenario Contract (`scenario.json`)
```json
{
  "name": "rsi_regime_verification",
  "description": "Verify Hayden 80/40 Bull and 60/20 Bear regime identification",
  "steps": [
    {
      "command": "python3.12 -c \"from myapp.domain.rsi import classify_regime; print(classify_regime(42.5))\"",
      "assertions": [
        {
          "type": "contains",
          "expected": "BULL_SUPPORT"
        },
        {
          "type": "exit_code",
          "expected": 0
        }
      ]
    }
  ]
}
```

### Running Contracts
```bash
# Run a single contract
bento run scenario.json --verbose

# Run all contracts in a directory
bento suite examples/ --name "Release Quality Gate"
```

---

## 🔄 5. Closed-Loop Self-Healing (`bento auto`)

When given a task and a ground-truth contract, Bento runs an automated agent loop:
1. Executes the contract.
2. If assertions fail, feeds the failure trace and AST violations to the LLM agent.
3. Automatically applies candidate patches and re-verifies.
4. Records the distilled fix into `.bento/memory/`.

```bash
bento auto --task fix_rsi_drift.md --contract tests/rsi_contract.json --max-iterations 4
```

---

## ⚔️ 6. Adversarial Red-Teaming Arena (`bento arena`)

To stress-test resilient systems (e.g. trading engines, parsers, state machines):
- **Attacker (Red-Team):** Generates pathological inputs, flash-crash candles, NaN values, edge cases.
- **Builder (Blue-Team):** Patches defensive guardrails.
- **Judge:** Deterministically enforces contract invariants.

```bash
bento arena --task task.md --contract contract.json --rounds 3
```

---

## 👥 7. Multi-Agent Swarm Pipeline (`bento swarm`)

For complex architectural features:
- **Architect:** Designs ports, interfaces, and separation of concerns.
- **Builder:** Writes pure domain entities and calculations.
- **Auditor:** Uses AST analysis to inspect code for zero I/O leaks.
- **Judge:** Runs Bento scenario assertions.

```bash
bento swarm --task spec.md --contract test_spec.json
```

---

## 📊 8. Web Monitor Dashboard & Live Terminal Telemetry

### Interactive Web Dashboard (`bento ui`)
Launches the Bento Monitor web app with a Joyful Bento Theme across 4 compartments:
- **🍳 Kitchen Chefs:** Monitors and controls detached background Butler tasks (`bento bg`).
- **🍙 Seasoned Recipes:** Explores domain axioms and anti-patterns stored in the Memory Bank (`bento memory`).
- **🍵 Night Dream & Tea:** Visualizes event traces and triggers autonomous dream cycles (`bento dream`).
- **🍱 Tasting Battery:** Evaluates deterministic verification contracts (`bento run` / `bento suite`).

```bash
# Serve locally and on LAN (viewable from mobile devices)
bento ui --network --no-browser --port 8765
```

### Live Terminal Telemetry (`bento monitor`)
Real-time ANSI dashboard showing live daemons, CPU/process health, and rule counts right in the terminal:
```bash
bento monitor --port 8765
```

---

## 🔒 Mandatory Clean-Code & Git Hygiene Directives
1. **Domain Purity:** Domain logic (`src/**/domain/**`) must never import `os`, `sys`, `subprocess`, `requests`, or invoke `print()`.
2. **Git Shield:** `.gitignore` must strictly exclude `GoogleService-Info.plist`, `xcuserdata/`, and `.env*`.
3. **Agent Sign-off:** After completing changes, always verify and state:
   > *"Logic is pure and decoupled from I/O. Git hygiene is enforced."*
