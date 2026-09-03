---
name: bento-harness
description: >-
  Autonomous Harness Engineering assistant (The Brain & Butler). Use to run background testing daemons,
  execute closed-loop self-healing (bento auto), query and update persistent architectural memory (bento memory),
  run overnight dream cycles (bento dream), and conduct adversarial red-team sparring (bento arena).
---

# 🍱 Bento Harness Engineering: The Brain & Butler

Bento acts as the **Brain (institutional memory & strategic guardrails)** and the **Butler (ambient background operations & execution valet)** for your software engineering workflow.

---

## 🎩 The Butler: Background Operations (`bento bg`)

When running long, complex, or CPU-intensive tasks, never block the interactive conversation. Dispatch the task to the Butler background runner:

```bash
# Start a task in the background
bento bg run "bento auto --task task.md --contract contract.json --max-iterations 5" --tag "auto-heal"

# Check background tasks status
bento bg list

# Inspect logs of a background task
bento bg logs <task_id> -n 50

# Terminate a task if needed
bento bg kill <task_id>
```

### Ambient Continuous Watching (`bento watch`)
To auto-test contracts on every save while coding:
```bash
bento watch <scenario.json> --dir src/
```

---

## 🧠 The Brain: Lifelong Memory & Guardrails (`bento memory`)

Before starting code generation in any domain (especially quant trading, math, or Clean Architecture), query Bento's memory bank:

```bash
# List all active rules and anti-patterns
bento memory list

# Add a discovered architectural rule
bento memory add --title "Clean Architecture Port" --rule "Never import I/O in domain layer" --category "architecture"
```

### Overnight "Dream Cycle" (`bento dream`)
Consolidates memories, prunes regressions, and benchmarks the full scenario battery:
```bash
# Run standalone or schedule overnight
bento dream --benchmarks examples/
```

---

## ⚔️ The Sparring Arena: Adversarial Red-Teaming (`bento arena`)

To stress-test and harden code against extreme market conditions, flash crashes, and unhandled edge cases:
```bash
bento arena --task task.md --contract contract.json --rounds 3
```

---

## 👥 Multi-Agent Swarm Pipeline (`bento swarm`)

To coordinate specialized roles for complex features:
```bash
bento swarm --task task.md --contract contract.json
```
- **Architect:** Clean Architecture breakdown.
- **Builder:** Pure domain implementation.
- **Auditor:** AST inspection for zero I/O leaks in domain.
- **Judge:** Bento ground-truth contract verification.

---

## 🔒 Mandatory Clean-Code & Git Hygiene Rules
1. **Purity:** Domain logic must never import `os`, `sys`, `subprocess`, `requests`, or call `print()`.
2. **Leak Prevention:** Always ensure `.gitignore` excludes `GoogleService-Info.plist`, `xcuserdata/`, and `.env*`.
