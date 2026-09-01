# Bento Architecture Reference

## Overview
**Bento** is a modular, high-reliability Harness Engineering System built for orchestrating, benchmarking, sandboxing, and evaluating automated tasks and AI agent workflows with autonomous closed-loop verification.

## Architectural Layers (Inward Dependency Order)

```
┌───────────────────────────────────────────────────────────┐
│ Frameworks & Drivers (CLI, FS Storage, Subprocess Runner, │
│                       Agent Drivers, Git Driver)          │
│   ┌───────────────────────────────────────────────────┐   │
│   │ Interface Adapters (Parsers, Presenters, Ctrl)    │   │
│   │   ┌───────────────────────────────────────────┐   │   │
│   │   │ Use Cases (AutoLoop, RunScenario, Suite)  │   │   │
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
  - `models.py`: Immutable domain entities (`Scenario`, `Step`, `Assertion`, `StepResult`, `ScenarioResult`, `SuiteResult`, `AutoLoopResult`, `AutoLoopIteration`, `AgentResponse`).
  - `rules.py`: Pure assertion evaluation algorithms and prompt synthesis rules (`build_initial_agent_prompt`, `build_corrective_agent_prompt`).
  - `ports.py`: Interface Protocols (`ExecutionGateway`, `StorageGateway`, `AgentGateway`, `GitGateway`, `PresenterGateway`, `ClockGateway`).
  - `exceptions.py`: Domain exception hierarchy.

### 2. Use Cases (Application Orchestration)
- **Location:** `src/bento/use_cases/`
- **Rules:** Orchestrates domain entities and interfaces. Depends ONLY on Domain layer.
- **Components:**
  - `auto_loop.py`: Coordinates the autonomous *Builder (AgentGateway) <-> Judge (RunScenarioUseCase)* closed loop with auto-feedback and auto-commit.
  - `run_scenario.py`: Executes scenario steps sequentially and evaluates assertion rules.
  - `run_suite.py`: Executes batches of scenarios and aggregates benchmark metrics.
  - `evaluate_output.py`: Applies ground-truth judge verification contracts against raw outputs.

### 3. Interface Adapters
- **Location:** `src/bento/adapters/`
- **Rules:** Translates data between external representations and domain formats.
- **Components:**
  - `parsers/scenario_parser.py`: Parses JSON / YAML / dict scenario definitions into validated Domain `Scenario` entities.
  - `presenters/console_presenter.py`: Formats Domain results into ANSI-colored terminal summaries, Markdown tables, or JSON strings. (Pure string transformation, zero `print` side-effects).
  - `controllers/cli_controller.py`: Translates CLI invocation arguments into Use Case requests and invokes presenters.

### 4. Frameworks & Drivers (Outer Layer)
- **Location:** `src/bento/frameworks/`
- **Rules:** Concrete external tools, standard library CLI parsers, OS interactions, and file system operations.
- **Components:**
  - `cli.py`: CLI entry point (`bento run`, `bento suite`, `bento auto`, `bento init`).
  - `agent_drivers.py`: Concrete `AgentGateway` implementations (`ClaudeCodeDriver`, `GenericCommandDriver`, `MockAgentDriver`).
  - `git_driver.py`: Concrete `GitGateway` implementation for automated atomic commits.
  - `subprocess_executor.py`: Concrete `ExecutionGateway` implementing sub-process execution.
  - `fs_storage.py`: Concrete `StorageGateway` reading files and saving output artifacts.

---

## Gravity Rules
1. **Dependency Direction:** Dependencies point strictly inward. High-level policies never depend on low-level tools.
2. **Side-Effect Isolation:** Pure logic and formatting are decoupled from I/O.
3. **Gateway Abstraction:** All external operations (system commands, agent invocation, git, file access, clock) are mediated by Protocols.
4. **Git Hygiene:** No sensitive data or environment artifacts are ever committed.
