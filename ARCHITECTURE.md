# Bento Architecture Reference

## Overview
**Bento** is a modular, high-reliability Harness Engineering System built for orchestrating, benchmarking, sandboxing, and evaluating automated tasks with **autonomous closed-loop verification, lifelong memory distillation, adversarial red-team self-play, and multi-agent swarm orchestration**.

## Architectural Layers (Inward Dependency Order)

```
┌───────────────────────────────────────────────────────────┐
│ Frameworks & Drivers (CLI, FS Storage, FS Memory, Runner, │
│                       Agent Drivers, Git, Worktree)       │
│   ┌───────────────────────────────────────────────────┐   │
│   │ Interface Adapters (Parsers, Presenters, Ctrl)    │   │
│   │   ┌───────────────────────────────────────────┐   │   │
│   │   │ Use Cases (Arena, Swarm, Opt, Auto, Dream)│   │   │
│   │   │   ┌───────────────────────────────────┐   │   │   │
│   │   │   │ Domain Layer (Models, Rules, Ports)│  │   │   │
│   │   │   └───────────────────────────────────┘   │   │   │
│   │   └───────────────────────────────────────────┘   │   │
│   └───────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

### 1. Domain (Inner Core)
- **Location:** `src/bento/domain/`
- **Rules:** Pure Python logic, zero external dependencies, strictly NO I/O.
- **Components:**
  - `models.py`: Immutable domain entities (`Scenario`, `Step`, `Assertion`, `StepResult`, `ScenarioResult`, `SuiteResult`, `AutoLoopResult`, `MemoryBank`, `MemoryLesson`, `DreamCycleResult`, `TraceEvent`, `CrystallizedSkill`, `ArenaResult`, `ArenaRound`, `SwarmRole`, `SwarmPipelineResult`, `OptimizerResult`).
  - `rules.py`: Pure assertion rules, prompt synthesizers, memory distillation algorithms, AST Clean Architecture validators (`validate_clean_architecture_ast`), candidate ranking algorithms, and Level 5 trace analyzers (`analyze_traces_for_lessons`, `detect_recurring_skill_patterns`).
  - `ports.py`: Interface Protocols (`ExecutionGateway`, `StorageGateway`, `AgentGateway`, `SwarmGateway`, `WorktreeGateway`, `GitGateway`, `MemoryGateway`, `TraceGateway`, `PresenterGateway`, `ClockGateway`).
  - `exceptions.py`: Domain exception hierarchy.

### 2. Use Cases (Application Orchestration)
- **Location:** `src/bento/use_cases/`
- **Rules:** Orchestrates domain entities and interfaces. Depends ONLY on Domain layer.
- **Components:**
  - `run_arena.py`: Coordinates Adversarial Red-Team (Attacker) vs Blue-Team (Builder) sparring rounds.
  - `run_swarm.py`: Coordinates Architect $\rightarrow$ Builder $\rightarrow$ Auditor $\rightarrow$ Judge swarm pipelines.
  - `optimize_prompts.py`: Benchmarks and ranks model / prompt candidates.
  - `auto_loop.py`: Coordinates the autonomous *Builder <-> Judge* loop with memory injection, auto-distillation, and append-only trace emission.
  - `distill_memory.py`: Extracts lessons from self-healing runs and generates regression contracts.
  - `dream_cycle.py`: Orchestrates overnight trace harvesting, offline memory consolidation, skill crystallization, and benchmark battery execution.
  - `run_scenario.py`: Executes scenario steps sequentially and evaluates assertion rules.
  - `run_suite.py`: Executes batches of scenarios and aggregates benchmark metrics.

### 3. Interface Adapters
- **Location:** `src/bento/adapters/`
- **Rules:** Translates data between external representations and domain formats.
- **Components:**
  - `parsers/scenario_parser.py`: Parses and serializes JSON / YAML / dict scenario definitions into validated Domain entities.
  - `presenters/console_presenter.py`: Formats Domain results into ANSI-colored terminal summaries, Markdown tables, or JSON strings. (Zero `print` side-effects).
  - `controllers/cli_controller.py`: Translates CLI invocation arguments into Use Case requests and invokes presenters.

### 4. Frameworks & Drivers (Outer Layer)
- **Location:** `src/bento/frameworks/`
- **Rules:** Concrete external tools, standard library CLI parsers, OS interactions, and file system operations.
- **Components:**
  - `fs_trace.py`: Concrete `FileSystemTraceGateway` managing append-only event trace logs in `.bento/traces/`.
  - `bg_runner.py`: Detached background daemon process manager (`bento bg`).
  - `watcher.py`: Ambient file modification watcher (`bento watch`).
  - `web_server.py`: Zero-dependency embedded HTTP server serving REST API and React dashboard (`bento ui`).
  - `terminal_monitor.py`: Live interactive ANSI terminal telemetry watch and keyboard shortcuts (`bento monitor`).
  - `cli.py`: CLI entry point (`bento run`, `bento suite`, `bento auto`, `bento arena`, `bento swarm`, `bento optimize`, `bento dream`, `bento memory`, `bento bg`, `bento watch`, `bento init`, `bento ui`, `bento monitor`).
  - `agent_drivers.py`: Concrete `AgentGateway` & `SwarmGateway` implementations (`ClaudeCodeDriver`, `GenericCommandDriver`, `SwarmDispatcherDriver`, `MockAgentDriver`).
  - `worktree_driver.py`: Concrete `WorktreeGateway` implementing isolated git worktree branch creation and merging.
  - `fs_memory.py`: Concrete `MemoryGateway` persisting to `.bento/memory/lessons.json` and human-readable `.bento/MEMORY.md`.
  - `git_driver.py`: Concrete `GitGateway` implementation for automated atomic commits.
  - `subprocess_executor.py`: Concrete `ExecutionGateway` implementing sub-process execution.
  - `fs_storage.py`: Concrete `StorageGateway` reading files and saving output artifacts.

### 5. Web Frontend (`web/`)
- **Technology:** Vite 6 + React 19 + TypeScript + TailwindCSS + Lucide Icons.
- **Views:**
  - `DaemonView.tsx`: Butler process list, status badges, log streaming modal, and kill actions.
  - `MemoryView.tsx`: Enforced rules search, tag filter chips, hard rule & anti-pattern callout cards.
  - `TracesView.tsx`: Sensory traces timeline, failed assertions inspect, crystallized skill macros, and one-click "Trigger Dream Cycle" button.
  - `BenchmarksView.tsx`: Scenarios list, assertions view, and live suite runner.
- **Production Build:** Static assets compiled into `web/dist/` and served directly by `bento ui` with zero external dependencies.

---

## Gravity Rules
1. **Dependency Direction:** Dependencies point strictly inward. High-level policies never depend on low-level tools.
2. **Side-Effect Isolation:** Pure logic and formatting are decoupled from I/O.
3. **Gateway Abstraction:** All external operations (system commands, agent invocation, git, memory persistence, worktrees, clock) are mediated by Protocols.
4. **Git Hygiene:** No sensitive data or environment artifacts are ever committed.
