---
name: bento-harness
description: >-
  Autonomous Harness Engineering assistant (The Brain & Butler). Use to run Bento commands directly from chat
  via native MCP tools or CLI, execute background testing daemons (bento bg), run closed-loop self-healing (bento auto),
  query and persist architectural memory (bento memory), trigger dream cycles (bento dream), launch live web & terminal telemetry (bento ui / bento monitor), and conduct adversarial red-team sparring (bento arena).
---

# 🍱 Bento Harness Engineering: The Brain & Butler Runbook for LLMs

Bento is a deterministic harness engineering and memory system built with Clean Architecture.
It functions as both the **Brain** (institutional memory, guardrails, and knowledge synthesis) and the **Butler** (ambient background execution valet and testing daemon).

As an LLM, you can execute Bento either via **Native MCP Tools** (preferred when tool calls are available) or via **Terminal CLI Commands** (`bento <subcommand>`).

---

## ⚡ Quick Reference: MCP Tools vs CLI Commands

| Capability | Native MCP Tool | CLI Command Equivalent |
| :--- | :--- | :--- |
| **Verify Scenario** | `bento_run(scenario_file=..., verbose=...)` | `bento run <file.json> [--verbose]` |
| **Run Test Suite** | `bento_suite(directory=..., suite_name=...)` | `bento suite <dir> [--name <name>]` |
| **List Memory Bank** | `bento_memory_list(cwd=...)` | `bento memory list [--json]` |
| **Add Rule to Memory** | `bento_memory_add(title=..., rule=..., ...)` | `bento memory add --title "..." --rule "..."` |
| **Dream Cycle** | `bento_dream(benchmarks_dir=..., harvest=...)` | `bento dream [--benchmarks <dir>]` |
| **Dispatch Background Task** | `bento_bg_run(command=..., tag=...)` | `bento bg run "<cmd>" --tag "<tag>"` |
| **List Background Tasks** | `bento_bg_list(cwd=...)` | `bento bg list` |
| **Task Status & Health** | `bento_bg_status(task_id=...)` | `bento bg status <task_id>` |
| **Task Telemetry Logs** | `bento_bg_logs(task_id=..., lines=50)` | `bento bg logs <task_id> -n 50` |
| **Kill Daemon Task** | `bento_bg_kill(task_id=...)` | `bento bg kill <task_id>` |
| **Self-Healing Loop** | *(via bento_bg_run or CLI)* | `bento auto --task <t.md> --contract <c.json>` |
| **Red-Team Arena** | *(via bento_bg_run or CLI)* | `bento arena --task <t.md> --contract <c.json>` |
| **Multi-Agent Swarm** | *(via bento_bg_run or CLI)* | `bento swarm --task <t.md> --contract <c.json>` |
| **Live Web UI** | *(via bento_bg_run or CLI)* | `bento ui [--port 8765] [--network] [--no-browser]` |
| **Terminal Telemetry** | *(via run_command)* | `bento monitor [--port 8765]` |

---

## 🎩 1. The Butler: Background Operations (`bento bg` / `bento_bg_*`)

When executing tasks taking >10 seconds, **never block interactive chat**. Dispatch the job to the Butler background runner.

### Running in Background
```bash
# Start an auto-healing loop in background
bento bg run "bento auto --task task.md --contract contract.json --max-iterations 5" --tag "auto-heal"

# Run an overnight dream cycle
bento bg run "bento dream --benchmarks examples/" --tag "dream"
```
Or via MCP:
```json
{
  "name": "bento_bg_run",
  "arguments": {
    "command": "bento dream --benchmarks examples/",
    "tag": "dream-cycle"
  }
}
```

### Checking Tasks and Logs
```bash
# List all active & past background tasks
bento bg list

# Inspect real-time stdout/stderr logs
bento bg logs bg-123456 -n 40

# Check process exit code & execution time
bento bg status bg-123456

# Terminate task if taking too long or diverging
bento bg kill bg-123456
```

---

## 🧠 2. The Brain: Lifelong Memory & Guardrails (`bento memory`)

Before writing trading strategies, mathematical algorithms, or Clean Architecture code, **always query Bento's memory bank** to load domain-specific axioms and anti-patterns.

### Querying Memory Bank
```bash
bento memory list
```
Or via MCP:
```json
{
  "name": "bento_memory_list",
  "arguments": { "cwd": "." }
}
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
Or via MCP:
```json
{
  "name": "bento_memory_add",
  "arguments": {
    "title": "Clean Architecture Boundary",
    "rule": "Domain layer must never import I/O, subprocess, or network packages.",
    "anti_pattern": "Calling print() or logging inside pure mathematical calculators.",
    "category": "architecture",
    "tags": ["clean-code", "domain"]
  }
}
```

---

## 🌙 3. Autonomous Dream Cycle (`bento dream`)

The Dream Cycle harvests historical traces from `.bento/traces/`, synthesizes lessons learned from test runs and auto-heals, crystallizes them into skills in `.bento/skills/`, and verifies memory consistency against benchmarks.

```bash
bento dream --benchmarks examples/
```
Or via MCP:
```json
{
  "name": "bento_dream",
  "arguments": {
    "benchmarks_dir": "examples",
    "harvest": true
  }
}
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
Or via MCP:
```json
{
  "name": "bento_run",
  "arguments": {
    "scenario_file": "scenario.json",
    "verbose": true
  }
}
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
Launches the Bento Monitor web app with a Joyful Bento Theme, displaying live background Butler daemons, persistent memory rules, benchmark pass rates, and dream cycles.
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
