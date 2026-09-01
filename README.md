# 🍱 Bento

> **A Clean-Architecture Harness Engineering System for Orchestration, Ground-Truth Verification, Autonomous Closed-Loop Workflows, and Lifelong Memory Self-Evolution.**

Inspired by modern **Harness Engineering** paradigms (as championed by `@cyrilXBT`), **Bento** moves beyond running "naked" LLMs and untracked scripts. It provides the structured scaffolding, contracts, execution sandboxes, and lifelong memory machinery necessary to govern, benchmark, and iteratively evolve autonomous AI agent workflows.

---

## 🌟 The 3 Levels of Bento Harness Engineering

| Layer | What It Does | Bento Commands |
| :--- | :--- | :--- |
| **Level 1: Verification** | Evaluates deterministic contracts & assertions | `bento run`, `bento suite` |
| **Level 2: Autonomous Loop** | Auto-feeds errors back to agent until green | `bento auto` |
| **Level 3: Lifelong Memory & Self-Evolution** | Auto-distills lessons into memory bank & generates regressions | `bento memory`, `bento dream` |

---

## 🚀 Key Capabilities

- 🔁 **Autonomous Closed-Loop Engine (`bento auto`):** Automatically drives the *Builder (Agent) $\leftrightarrow$ Judge (Harness)* feedback loop until 100% of assertions pass.
- 🧠 **Lifelong Persistent Memory Bank (`.bento/MEMORY.md`):** Auto-distills architectural lessons and anti-patterns whenever a task self-heals, preventing future regressions.
- 🔍 **Dynamic Context Injection:** Automatically injects relevant past lessons into future agent prompts before code is generated.
- 📈 **Self-Scaling Regression Suite:** Converts discovered bugs into permanent benchmark contracts.
- 🌙 **Overnight Dream Cycle (`bento dream`):** Consolidates memory and runs the entire benchmark battery as a sparring check while you sleep.
- 🍱 **Compartmentalized Clean Architecture:** Strict 4-layer separation (Pure Domain $\rightarrow$ Use Cases $\rightarrow$ Adapters $\rightarrow$ Frameworks). Zero I/O in domain logic.

---

## 🏗️ Architecture Hierarchy

Bento enforces inward-only dependency boundaries:

```
src/bento/
├── domain/            # Tier 1: Pure Domain Logic (Models, Assertion Rules, Memory Rules, Ports)
├── use_cases/         # Tier 2: Application Orchestration (AutoLoop, DistillMemory, DreamCycle, RunSuite)
├── adapters/          # Tier 3: Interface Adapters (Parsers, Console/JSON Presenters, CLI Controller)
└── frameworks/        # Tier 4: Frameworks & Drivers (Agent Drivers, Memory Storage, Subprocess Runner, Git)
```

For complete architectural specifications, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 🚀 CLI Commands & Workflows

### 1. Installation

To make the `bento` command globally accessible across your terminal:
```bash
cd /Users/tmnguyen/Dev/bento
pip install -e .
```

---

### 2. Autonomous Closed-Loop Execution (`bento auto`)

Give Bento a task objective and a ground-truth contract. Bento will invoke the AI agent, test the code, feed errors back automatically, distill new lessons into `.bento/MEMORY.md`, and commit when green:

```bash
bento auto --task examples/task_demo.md --contract examples/task_contract.json --max-iterations 5 --auto-commit
```

---

### 3. Inspecting & Managing Memory (`bento memory`)

```bash
# List all active memory rules
bento memory list

# Manually add a project rule
bento memory add --title "Clean Architecture Rule" --rule "Never import I/O directly in domain layer" --category "architecture"
```

---

### 4. Running the Overnight Dream Cycle (`bento dream`)

Runs memory consolidation and verifies the entire benchmark suite:

```bash
bento dream --benchmarks examples/
```

Output:
```
🌙 Bento Dream Cycle Maintenance Completed
🧠 Memory Bank: 3 active rules enforced
⏱️  Duration: 74.3ms
────────────────────────────────────────────────────────────
🍱 Bento Suite: Bento Dream-Cycle Verification Battery [ALL PASSED]
📊 Pass Rate: 100.0% (3/3 passed)
⏱️  Suite Duration: 74.1ms
============================================================
  [✓ PASS] Agent Code-Gen Verification Rig          (19.0ms)
  [✓ PASS] Core System Health Check                 (33.5ms)
  [✓ PASS] Quant Calc Signal Normalizer Contract    (21.5ms)
============================================================
```

---

### 5. Running Single Contracts & Suites

```bash
# Run a single contract evaluation
bento run examples/basic_test.json

# Run a suite of contracts
bento suite examples/ --name "Release Verification Suite"
```

---

## 🧪 Running Tests

```bash
PYTHONPATH=src python3.12 -m unittest discover -s tests -v
```

---

## 🔒 Security & Git Hygiene

- Pre-configured `.gitignore` prevents leaks of API keys, `.env*`, and platform-specific metadata (`GoogleService-Info.plist`, `xcuserdata/`).
- Logic is pure and decoupled from I/O.
