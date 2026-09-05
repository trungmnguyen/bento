# Bento Harness Engineering: Agent Rules & Directives

All AI coding agents interacting with projects managed or audited by Bento MUST adhere to the following operational directives:

---

## 1. The Butler Principle: Never Block Interactive Chat on Long Tasks
- Any operation expected to take more than 10 seconds (e.g. `bento auto`, `bento dream`, `bento arena`, long test suites) must be delegated to the **Butler Background Runner**:
  - MCP tool: `bento_bg_run(command=..., tag=...)`
  - CLI: `bento bg run "<command>" --tag "<tag>"`
- Monitor progress asynchronously using `bento_bg_status` / `bento bg status <task_id>` and `bento_bg_logs` / `bento bg logs <task_id>`.
- Keep the user informed with clear task IDs and status updates.

---

## 2. The Brain Principle: Query Memory Before Generating Code
- Before designing or modifying quantitative trading logic, risk rules, math formulations, or Clean Architecture layers:
  - Query existing institutional memory: `bento memory list` or MCP `bento_memory_list`.
  - Check for specific anti-patterns (e.g. RSI 70/30 false assumptions, counter-trend scalping against macro trend ribbons, I/O in domain).
- When a new recurring architectural pattern, anti-pattern, or domain axiom is established:
  - Record it into memory: `bento memory add --title "<Title>" --rule "<Rule>" --anti-pattern "<AntiPattern>" --category "<Category>"`.

---

## 3. Ground-Truth Verification Over Assumptions
- Never report a feature or fix as complete without running ground-truth contract assertions:
  - Single contract: `bento run <contract.json>` or MCP `bento_run(scenario_file=...)`.
  - Regression suite: `bento suite <directory>` or MCP `bento_suite(directory=...)`.
- If an agent fix fails assertions, run closed-loop healing with `bento auto --task <task.md> --contract <contract.json> --max-iterations 3`.

---

## 4. Clean Architecture & Git Hygiene Enforcement
- **AST Purity:** Domain logic (`src/**/domain/**`) must remain 100% pure without external I/O (no `os`, `sys`, `subprocess`, `requests`, `print`). All external interactions must use interface adapters or gateways.
- **Git Shield:** Ensure `.gitignore` ignores `GoogleService-Info.plist`, `xcuserdata/`, and `.env*`. Never commit secrets or local IDE state.
- **Confirmation:** When presenting completed code changes, confirm:
  > *"Logic is pure and decoupled from I/O. Git hygiene is enforced."*
