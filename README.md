# 🍱 Bento

> **A Clean-Architecture Harness Engineering System for Ground-Truth Verification, Autonomous Closed-Loop Self-Healing, Lifelong Memory Distillation, and Adversarial Swarm Arenas.**

Inspired by modern **Harness Engineering** paradigms (as championed by `@cyrilXBT`), **Bento** moves beyond running "naked" LLMs and untracked scripts. It provides the structured scaffolding, contracts, execution sandboxes, lifelong memory machinery, and adversarial self-play arenas necessary to govern, benchmark, and iteratively evolve autonomous AI agent workflows.

---

## 🌟 The 4 Levels of Bento Harness Engineering

| Level | Name | Primary Focus | Bento CLI Commands |
| :--- | :--- | :--- | :--- |
| **Level 1** | **Deterministic Verification** | Ground-truth assertions & scorecards | `bento run`, `bento suite` |
| **Level 2** | **Autonomous Closed Loop** | Builder $\leftrightarrow$ Judge zero-touch self-healing | `bento auto` |
| **Level 3** | **Lifelong Memory** | Memory bank distillation & overnight dream cycle | `bento memory`, `bento dream` |
| **Level 4** | **Adversarial Swarm Arena** | Red-teaming self-play, multi-agent swarms, & optimizer | `bento arena`, `bento swarm`, `bento optimize` |

---

## 🚀 Key Capabilities

- ⚔️ **Adversarial Self-Play Arena (`bento arena`):** Spawns a Red-Team Attacker to fuzz code and discover edge cases $\leftrightarrow$ Blue-Team Builder patches the code until 100% hardened.
- 👥 **Multi-Agent Role Swarms (`bento swarm`):** Coordinates specialized personas: **Architect** (Clean Architecture plan) $\rightarrow$ **Builder** (domain code) $\rightarrow$ **Auditor** (AST boundary inspection) $\rightarrow$ **Judge** (Bento contract verification).
- 🧬 **Model & Prompt Optimizer (`bento optimize`):** Automatically benchmarks candidates across scenario suites to rank accuracy and latency.
- 🔁 **Autonomous Closed-Loop Engine (`bento auto`):** Automatically drives the *Builder (Agent) $\leftrightarrow$ Judge (Harness)* feedback loop until 100% of assertions pass.
- 🧠 **Lifelong Persistent Memory Bank (`.bento/MEMORY.md`):** Auto-distills architectural lessons whenever a task self-heals, preventing future regressions.
- 🌙 **Overnight Dream Cycle (`bento dream`):** Consolidates memory and runs the entire benchmark battery as a sparring check while you sleep.
- 🍱 **Compartmentalized Clean Architecture:** Strict 4-layer separation (Pure Domain $\rightarrow$ Use Cases $\rightarrow$ Adapters $\rightarrow$ Frameworks). Zero I/O in domain logic.

---

## 🏗️ Architecture Hierarchy

Bento enforces inward-only dependency boundaries:

```
src/bento/
├── domain/            # Tier 1: Pure Domain Logic (Models, Assertion Rules, Memory Rules, AST Rules, Ports)
├── use_cases/         # Tier 2: Application Orchestration (Arena, Swarm, Optimize, AutoLoop, Distill, Dream)
├── adapters/          # Tier 3: Interface Adapters (Parsers, Console/JSON Presenters, CLI Controller)
└── frameworks/        # Tier 4: Frameworks & Drivers (Agent Drivers, Worktrees, Memory Storage, Subprocess Runner, Git)
```

For complete architectural specifications, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 🚀 CLI Commands & Workflows

### 1. Installation

To make the `bento` command globally accessible across your terminal:
```bash
git clone https://github.com/trungmnguyen/bento.git
cd bento
pip install -e .
```

---

### 2. Adversarial Self-Play Arena (`bento arena`)

Runs Red-Team Attacker vs. Blue-Team Builder sparring to harden code against unhandled edge cases:

```bash
bento arena --task examples/task_demo.md --contract examples/task_contract.json --rounds 3
```

---

### 3. Multi-Agent Role Swarm Pipeline (`bento swarm`)

Executes structured handoffs across Architect $\rightarrow$ Builder $\rightarrow$ Auditor $\rightarrow$ Judge:

```bash
bento swarm --task examples/task_demo.md --contract examples/task_contract.json
```

---

### 4. Model & Prompt Optimizer (`bento optimize`)

Benchmarks and ranks model / prompt candidates:

```bash
bento optimize --suite examples/
```

---

### 5. Autonomous Closed-Loop Execution (`bento auto`)

```bash
bento auto --task examples/task_demo.md --contract examples/task_contract.json --max-iterations 5 --auto-commit
```

---

### 6. Level 5: Autonomous "Dreaming" & Trace Harvester (`bento dream`)

Implements Anthropic-grade Harness Engineering (*"Turn yesterday's logs into new memory and skills — the harness wakes up smarter"*):
- Ingests event-sourced traces from `.bento/traces/*.jsonl`.
- Clusters multi-iteration repairs and sandbox crashes to synthesize new `MemoryLesson` rules & anti-patterns.
- Crystallizes recurring command patterns into reusable procedural skill macros.
- Executes regression benchmark sparring battery.

```bash
# List active memory rules
bento memory list

# Run overnight Dream Cycle with trace harvesting
bento dream --benchmarks examples/ --harvest

# Run benchmarks only without log harvesting
bento dream --benchmarks examples/ --no-harvest
```

---


### 7. The Butler: Background Daemon Runner (`bento bg`)

Delegate long-running or CPU-intensive tasks (e.g. overnight dream cycles, adversarial arena sparring, auto-healing loops) to run detached in the background:

```bash
# Start a background task
bento bg run "bento dream --benchmarks examples/" --tag "nightly-dream"

# Check active background tasks
bento bg list

# View live logs of a background task
bento bg logs <task_id> -n 50

# Check status metadata
bento bg status <task_id>

# Terminate a running task
bento bg kill <task_id>
```

---

### 8. Ambient Continuous Watcher (`bento watch`)

Continuously monitors code and contract files, auto-evaluating assertions the millisecond you save:

```bash
bento watch examples/basic_test.json --dir src/
```

---

### 9. Antigravity Skill & Plugin (`bento-plugin` / `bento`)

Bento is integrated with **Google Antigravity (AGY)** as an official plugin and skill (`plugins/bento-plugin/` and `~/.gemini/config/plugins/bento-plugin/`). AI agents can execute Bento directly from chat via CLI commands without any heavy middleware:

- **Verification:** `bento run <contract.json>`, `bento suite <dir>`
- **Memory Bank:** `bento memory list`, `bento memory add`
- **Autonomous Dream:** `bento dream --benchmarks examples/`
- **Butler Background Daemons:** `bento bg run "<cmd>"`, `bento bg list`, `bento bg status`, `bento bg logs`
- **Telemetry & Dashboards:** `bento ui`, `bento monitor`

See [`SKILL.md`](.agents/skills/bento/SKILL.md) and [`plugins/bento-plugin/`](plugins/bento-plugin/) for complete specifications and runbooks.

---

### 10. Bento Web Monitor Dashboard: The 4 Compartments (`bento ui`)

The Bento Web Monitor is a joyful, real-time telemetry dashboard accessible on desktop and mobile (`bento ui --network --no-browser --port 8765`). It is organized around 4 culinary compartments mapping directly to core Harness Engineering operations:

| Compartment (Tab) | Culinary Persona | Engineering Role | Core Benefit |
| :--- | :--- | :--- | :--- |
| **🍳 Kitchen Chefs** | Head Chef's Stove | **Butler Daemon Runner (`bento bg`)** | Tracks detached background processes, displays live PID/runtime, streams terminal logs, and launches background tasks without blocking interactive workflows. |
| **🍙 Seasoned Recipes** | Secret Recipe Book | **Lifelong Memory Bank (`bento memory`)** | Visualizes active domain axioms, Clean Architecture guardrails, and negative anti-patterns stored in `.bento/memory/` to prevent regressions. |
| **🍵 Night Dream & Tea** | Nightly Tea & Reflection | **Level 5 Autonomous Dreaming (`bento dream`)** | Ingests execution traces (`.bento/traces/`), displays crystallized skill macros, and triggers overnight memory consolidation. |
| **🍱 Tasting Battery** | Bento Tasting Flights | **Deterministic Verification (`bento run` / `bento suite`)** | Displays scenario contracts (`scenario.json`), assertions, and provides a one-click *"Taste All Contracts 🥢"* quality gate with live pass rates. |

For frontend implementation details and mobile responsiveness guidelines, see [`web/README.md`](web/README.md).

---

## 🧪 Running Tests

```bash
PYTHONPATH=src python3.12 -m unittest discover -s tests -v
```

---

## 🔒 Security & Git Hygiene

- Pre-configured `.gitignore` prevents leaks of API keys, `.env*`, and platform-specific metadata (`GoogleService-Info.plist`, `xcuserdata/`).
- Logic is pure and decoupled from I/O.
