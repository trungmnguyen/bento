---
name: bento-sprint
description: >-
  Executes the Bento Continuous Triad Sprint (Wasabi 🌶️ Red Team + Matcha 🍵 Green Team -> Patron 🥢 User Approval -> Chef 🍳 Blue Team).
  Use whenever the user requests a timeboxed engineering review sprint, autonomous code audit, security hardening, UX innovation, or asks to run a Bento sprint.
---

# 🍱 Bento Continuous Triad Sprint Runbook

The Bento Triad Sprint coordinates autonomous multi-agent reconnaissance, human-in-the-loop review gating, Clean Architecture implementation, and ground-truth contract verification in continuous timeboxed cycles.

```
       [ 🌶️ Spicy Wasabi (Red Team: Security) ]
                          +
       [ 🍋 Yuzu Sensory (Yellow Team: UI/A11y)]  ==>  [ 🥢 Patron Gate (User Review) ]  ==>  [ 🍳 Executive Chef (Blue Team) ]
                          +                                     │                                     │
       [ 🍵 Matcha Master (Green Team: DX/Feat)]                │ (Explicit Approval)                 ▼
                          ▲                                     └─────────────────── [ Ground-Truth Verification ]
                          └─────────────────── (Next Iteration) ─────────────────────┘
```

---

## 🔒 Mandatory Invariants

### 1. Bento Harness Native Invariant (Crucial)
Every operational subtask within the sprint MUST be orchestrated natively through Bento CLI primitives:
- **Background Execution:** `bento bg run "<cmd>" --tag "<tag>"` (zero unmonitored raw shell backgrounding).
- **AST Architecture Audits:** `bento check` (verifies 100% pure domain AST without I/O).
- **Institutional Knowledge:** `bento memory list` and `bento memory add`.
- **Ground-Truth Verification:** `bento run <contract.json>` and `bento suite <dir>`.
- **Sprint Coordination:** `bento orchestra [--rounds <n>] [--benchmarks <dir>]`.

### 2. Culinary Role Invariants
- **Red Team Auditor (🌶️ Spicy Wasabi):** Adversarial systems auditor. Focus: Security, path traversal, injection, concurrency, race conditions, memory leaks, AST violations. **Strict Invariant: 100% Read-Only.** Zero file modifications, zero commits.
- **Yellow Team Auditor (🍋 Yuzu Sensory):** UI layout & Accessibility auditor. Focus: WCAG 2.1 AA compliance, ARIA attributes, keyboard tab traps, color contrast, responsive clipping. **Strict Invariant: 100% Read-Only.** Zero file modifications, zero commits.
- **Green Team Innovator (🍵 Matcha Master):** Core feature auditor & DX explorer. Focus: Auditing core capability bottlenecks, feature brainstorming, UX visualizers, telemetry sparklines, interactive wizards. **Strict Invariant: 100% Read-Only.** Zero file modifications, zero commits.
- **Patron Gate Reviewer (🥢 Bento Patron):** Orchestrator compiles findings into `implementation_plan.md`. **Strict Invariant: Zero code execution or modifications before explicit user approval.**
- **Blue Team Craftsman (🍳 Executive Chef):** Implements approved items following Clean Architecture, enforces AST purity, and upholds Git shield hygiene.

---

## ⚡ Execution Protocol: Step-by-Step

### Phase 1: Set Sprint Timebox & Register Butler Daemon
1. Determine sprint duration (default: 3600 seconds / 1 hour).
2. Set a one-shot notification timer via the `schedule` tool:
   - `DurationSeconds=3600`, `TimerCondition="never"`, `Prompt="Sprint timer expired: review completed cycles and summarize delivery"`.
3. **Register Butler Daemon:** Launch the sprint harness in the Butler background runner:
   `bento bg run "bento orchestra --rounds 1" --tag "triad-sprint"`
   *(This ensures the sprint immediately appears and is tracked in **Kitchen Chefs** (`DaemonView`) in the web monitor).*

### Phase 2: Launch Parallel Reconnaissance Subagents
Launch the three reconnaissance teams concurrently using `invoke_subagent`:

```python
invoke_subagent(
    Subagents=[
        {
            "TypeName": "self",
            "Role": "Red Team Auditor (🌶️ Spicy Wasabi)",
            "Prompt": (
                "You are Red Team Auditor (🌶️ Spicy Wasabi). Conduct an adversarial audit of the Bento project at <repo_path>.\n"
                "DO NOT MODIFY SOURCE CODE OR COMMIT. Strictly audit:\n"
                "1. Security & Edge Cases (path traversal, env injection, shell escapes)\n"
                "2. Reliability & Concurrency (process leaks, race conditions, timeouts)\n"
                "3. Clean Architecture AST Purity (domain layer leaks)\n"
                "Return findings with Title, Severity, File/Line, Failure Mechanism, and Recommended Fix."
            )
        },
        {
            "TypeName": "self",
            "Role": "Yellow Team Auditor (🍋 Yuzu Sensory)",
            "Prompt": (
                "You are Yellow Team Auditor (🍋 Yuzu Sensory) for the Bento project at <repo_path>.\n"
                "DO NOT MODIFY SOURCE CODE OR COMMIT. Strictly audit:\n"
                "1. Accessibility (WCAG 2.1 AA): Missing ARIA labels, image alt text, keyboard focus rings, tab traps.\n"
                "2. Visual & Layout Ergonomics: Mobile responsiveness, text clipping, contrast ratios, z-index clobbering.\n"
                "3. Screen-Reader Cues: Interactive divs without role='button' or keyboard handlers.\n"
                "Return findings with Title, Component/File, WCAG Violation, and Recommended Fix."
            )
        },
        {
            "TypeName": "self",
            "Role": "Green Team Innovator (🍵 Matcha Master)",
            "Prompt": (
                "You are Green Team Innovator (🍵 Matcha Master). Conduct a Core Feature Audit & DX Innovation Brainstorm at <repo_path>.\n"
                "DO NOT MODIFY SOURCE CODE OR COMMIT. Strictly audit and design:\n"
                "1. Core Feature Audit: Evaluate current pillars (Memory Bank, Background Runner, Arena Sparring, Dream Cycle) for user friction and missing workflows.\n"
                "2. Feature Innovation: Brainstorm 2-3 high-impact capabilities (interactive visualizers, telemetry sparklines, CLI wizards).\n"
                "Return proposals with Title, User Story, Component Architecture, and DX Value."
            )
        }
    ]
)
```

### Phase 3: Synthesize Triad Plan & Gated User Presentation
1. Consolidate Red Team vulnerabilities and Green Team feature proposals.
2. Formulate an `implementation_plan.md` artifact:
   - Group by urgency (Critical/High bug fixes first, high-value DX features second).
   - Identify affected architectural components and files.
   - Outline automated verification steps.
3. Set `request_feedback = true` and **STOP** to wait for user approval.

### Phase 4: Blue Team Execution & Memory Distillation (Executive Chef 🍳)
1. Blue Team executes approved changes.
2. Adhere to Clean Architecture:
   - Domain logic (`src/**/domain/**`) must remain 100% pure (zero I/O, subprocess, or network).
   - Route all external operations through interface adapters and gateways.
3. **Memory Distillation Invariant:** Immediately distill every discovered bug, security flaw, or A11y invariant into Bento's Memory Bank:
   `bento memory add --title "<Title>" --rule "<Rule>" --anti-pattern "<AntiPattern>" --category "<Category>"`
   *(This ensures newly learned rules appear in **Seasoned Recipes** (`MemoryView`) and prevent future AI regressions).*

### Phase 5: Ground-Truth Verification & Trace Emission
Run the 5-stage verification battery:
1. `bento check` — AST domain purity check (100% pure required).
2. Pair each new fix/feature with a contract in `examples/` and run `bento run <contract.json>` (emits execution traces).
3. `bento orchestra --rounds 1 --auto-approve` or `bento suite <dir>` — Deterministic suite verification.
4. Unit test discovery (`python3.12 -m unittest discover -s tests` or `uv run pytest`).
5. Web UI build (`cd web && npm run build`).

### Phase 6: Dream Harvesting, Iterative Cycling & Completion
1. **Dream Harvesting Invariant:** Trigger a dream harvest via the Butler background runner:
   `bento bg run "bento dream --benchmarks examples/ --harvest" --tag "overnight-dream"`
   *(This distills multi-iteration recovery rules into **Seasoned Recipes** and crystallizes reusable macros into **Night Dream & Tea**).*
2. If time remains on the sprint timer: cycle back to **Phase 2** for the next wave.
3. When the sprint timer expires or the user requests wrap-up: update `walkthrough.md` and present the sign-off:
   > *"Logic is pure and decoupled from I/O. Git hygiene is enforced."*
