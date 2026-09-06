"""TerminalMonitor: Live interactive ANSI terminal monitor and watch dashboard for Bento."""
from __future__ import annotations
import datetime
import os
import select
import sys
import termios
import time
import tty
from pathlib import Path

from bento.domain.ports import MemoryGateway, StorageGateway, TraceGateway
from bento.frameworks.bg_runner import BackgroundTaskRunner
from bento.use_cases.dream_cycle import DreamCycleUseCase
from bento.use_cases.run_suite import RunSuiteUseCase


class TerminalMonitor:
    def __init__(
        self,
        bg_runner: BackgroundTaskRunner,
        memory_gateway: MemoryGateway,
        storage_gateway: StorageGateway,
        run_suite_uc: RunSuiteUseCase,
        dream_uc: DreamCycleUseCase,
        trace_gateway: TraceGateway | None = None,
        refresh_interval: float = 1.0,
    ):
        self.bg_runner = bg_runner
        self.memory_gateway = memory_gateway
        self.storage_gateway = storage_gateway
        self.run_suite_uc = run_suite_uc
        self.dream_uc = dream_uc
        self.trace_gateway = trace_gateway
        self.refresh_interval = refresh_interval
        self._status_banner = "ACTIVE"
        self._action_message = ""

    def _c(self, code: str, text: str) -> str:
        return f"\033[{code}m{text}\033[0m"

    def render_screen(self) -> str:
        tasks = self.bg_runner.list_tasks()
        running_tasks = [
            t for t in tasks
            if (t.get("status") if isinstance(t, dict) else getattr(t, "status", None)) == "RUNNING"
        ]
        memory = self.memory_gateway.load_memory()
        traces = self.trace_gateway.load_recent_traces(10) if self.trace_gateway else []

        now_str = datetime.datetime.now().strftime("%H:%M:%S")
        lines: list[str] = []

        # ANSI clear screen & move to home
        lines.append("\033[2J\033[H")

        # Top Header
        lines.append(self._c("1;34", "🍱 BENTO TELEMETRY TERMINAL WATCH") + " " + self._c("90", f"[Refreshed: {now_str}]"))
        lines.append(self._c("90", "─" * 70))

        # Status Strip
        stat_line = (
            f"Status: {self._c('32;1', self._status_banner)} | "
            f"Daemons: {self._c('36', str(len(running_tasks)))} running / {len(tasks)} total | "
            f"Memory: {self._c('35', str(len(memory.lessons)))} rules"
        )
        lines.append(stat_line)
        if self._action_message:
            lines.append(self._c("33;1", f"📢 {self._action_message}"))
        lines.append(self._c("90", "─" * 70))

        # Section 1: Butler Background Daemons
        lines.append(self._c("1;36", "🤖 BUTLER DAEMON PROCESSES (bento bg)"))
        if not tasks:
            lines.append("  (No background tasks active. Launch with 'bento bg run <cmd>')")
        else:
            for t in tasks[:5]:
                status = t.get("status", "STOPPED") if isinstance(t, dict) else getattr(t, "status", "STOPPED")
                task_id = (t.get("id") or t.get("task_id", "—")) if isinstance(t, dict) else getattr(t, "task_id", getattr(t, "id", "—"))
                pid = t.get("pid", "—") if isinstance(t, dict) else getattr(t, "pid", "—")
                cmd = t.get("command", "") if isinstance(t, dict) else getattr(t, "command", "")
                started_at = t.get("started_at") if isinstance(t, dict) else getattr(t, "started_at", None)
                duration_sec = 0.0
                if started_at:
                    try:
                        duration_sec = (datetime.datetime.now() - datetime.datetime.fromisoformat(started_at)).total_seconds()
                    except Exception:
                        pass
                status_color = "32" if status == "RUNNING" else ("34" if status == "COMPLETED" else "31")
                status_badge = self._c(status_color, f"[{status}]")
                lines.append(
                    f"  {self._c('1', str(task_id))} {status_badge} PID: {pid or '—'} "
                    f"Runtime: {duration_sec:.1f}s | {self._c('90', str(cmd)[:35])}"
                )
        lines.append(self._c("90", "─" * 70))

        # Section 2: Memory Bank Highlights
        lines.append(self._c("1;35", "🧠 PERSISTENT MEMORY BANK (Active Enforced Rules)"))
        if not memory.lessons:
            lines.append("  (Memory bank empty. Ingest with 'bento memory add' or auto-healing)")
        else:
            for l in memory.lessons[:4]:
                tags_str = " ".join([f"#{tag}" for tag in l.tags[:3]])
                lines.append(f"  {self._c('36', l.id)} {self._c('1', l.title[:38])} {self._c('90', tags_str)}")
                lines.append(f"    ↳ {self._c('32', l.rule[:65])}...")
        lines.append(self._c("90", "─" * 70))

        # Section 3: Recent Traces & Sensory Events
        lines.append(self._c("1;33", "⚡ RECENT SENSORY TRACES & SELF-HEALING"))
        if not traces:
            lines.append("  (No recent execution traces in .bento/traces/)")
        else:
            for tr in traces[:3]:
                badge = self._c("32", "✓") if tr.passed else self._c("31", "✗")
                time_str = tr.timestamp.split("T")[-1][:8] if "T" in tr.timestamp else ""
                lines.append(f"  {badge} [{time_str}] {tr.task_name} (iter {tr.iteration})")
                if tr.failed_assertions:
                    lines.append(f"    ↳ {self._c('31', tr.failed_assertions[0][:65])}")
        lines.append(self._c("90", "─" * 70))

        # Hotkeys bar
        controls = (
            f"{self._c('1;37', '[r]')} Run Contracts  "
            f"{self._c('1;37', '[d]')} Dream Cycle  "
            f"{self._c('1;37', '[k]')} Kill Tasks  "
            f"{self._c('1;37', '[q]')} Quit"
        )
        lines.append(controls)
        return "\n".join(lines)

    def run_loop(self, max_cycles: int | None = None) -> None:
        """Starts the interactive terminal watch loop."""
        # Check if running in an interactive terminal
        if not sys.stdin.isatty():
            # Non-interactive mode (e.g. tests or piped): render single frame
            print(self.render_screen())
            return

        old_settings = termios.tcgetattr(sys.stdin)
        cycles = 0
        try:
            tty.setcbreak(sys.stdin.fileno())
            while max_cycles is None or cycles < max_cycles:
                cycles += 1
                sys.stdout.write(self.render_screen() + "\n")
                sys.stdout.flush()

                # Non-blocking key check with timeout
                rlist, _, _ = select.select([sys.stdin], [], [], self.refresh_interval)
                if rlist:
                    ch = sys.stdin.read(1).lower()
                    # REL-20: Drain any excess queued input (e.g. pasted blocks or held keys)
                    while select.select([sys.stdin], [], [], 0)[0]:
                        try:
                            sys.stdin.read(1)
                        except Exception:
                            break

                    if ch == "q":
                        break
                    elif ch == "r":
                        self._action_message = "Running Verification Suite..."
                        sys.stdout.write(self.render_screen() + "\n")
                        sys.stdout.flush()
                        self._handle_run_suite()
                    elif ch == "d":
                        self._action_message = "Executing Dream Cycle & Log Harvesting..."
                        sys.stdout.write(self.render_screen() + "\n")
                        sys.stdout.flush()
                        self._handle_dream()
                    elif ch == "k":
                        self._handle_kill_all()

                # REL-20: 50ms minimum loop debounce to protect against high-frequency CPU pegging
                time.sleep(0.05)
        finally:
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
            print("\nExiting Bento Terminal Watch.")

    def _handle_run_suite(self) -> None:
        try:
            scenarios = []
            for d in ["benchmarks", "examples"]:
                if os.path.exists(d):
                    for f in self.storage_gateway.list_files(d, "*.json"):
                        try:
                            from bento.adapters.parsers.scenario_parser import ScenarioParser
                            scenarios.append(ScenarioParser.from_json(self.storage_gateway.read_text(f)))
                        except Exception:
                            continue
            res = self.run_suite_uc.execute(scenarios, suite_name="Terminal Live Battery")
            self._action_message = f"Suite Complete: {res.passed_scenarios}/{res.total_scenarios} passed ({res.pass_rate:.0f}%) in {res.total_duration_ms:.0f}ms"
        except Exception as e:
            self._action_message = f"Error running suite: {e}"

    def _handle_dream(self) -> None:
        try:
            res = self.dream_uc.execute(benchmarks_dir="examples", harvest_traces=True)
            self._action_message = f"Dream Complete! Harvested {res.new_lessons_discovered} new lessons."
        except Exception as e:
            self._action_message = f"Error during dream: {e}"

    def _handle_kill_all(self) -> None:
        tasks = self.bg_runner.list_tasks()
        killed_count = 0
        for t in tasks:
            status = t.get("status") if isinstance(t, dict) else getattr(t, "status", None)
            task_id = (t.get("id") or t.get("task_id")) if isinstance(t, dict) else getattr(t, "task_id", getattr(t, "id", None))
            if status == "RUNNING" and task_id:
                if self.bg_runner.kill_task(task_id):
                    killed_count += 1
        self._action_message = f"Terminated {killed_count} active daemon task(s)."
