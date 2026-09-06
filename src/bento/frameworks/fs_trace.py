"""FileSystemTraceGateway: Concrete driver implementing TraceGateway via local append-only JSONL files."""
from __future__ import annotations
import json
import os
import threading
from pathlib import Path
from bento.domain.models import TraceEvent
from bento.domain.ports import TraceGateway


class FileSystemTraceGateway(TraceGateway):
    _trace_lock = threading.Lock()

    def __init__(self, base_dir: str | None = None):
        self._default_base_dir = base_dir

    def _get_traces_dir(self, working_dir: str | None = None) -> Path:
        base = Path(working_dir or self._default_base_dir or os.getcwd())
        traces_path = base / ".bento" / "traces"
        traces_path.mkdir(parents=True, exist_ok=True)
        return traces_path

    def append_trace_event(self, event: TraceEvent, working_dir: str | None = None) -> None:
        traces_dir = self._get_traces_dir(working_dir)
        date_str = event.timestamp.split("T")[0] if "T" in event.timestamp else "current"
        trace_file = traces_dir / f"trace_{date_str}.jsonl"

        event_dict = {
            "timestamp": event.timestamp,
            "task_name": event.task_name,
            "iteration": event.iteration,
            "event_type": event.event_type,
            "prompt_sent": event.prompt_sent,
            "agent_output": event.agent_output,
            "exit_code": event.exit_code,
            "passed": event.passed,
            "failed_assertions": event.failed_assertions,
            "tags": event.tags,
        }

        line = json.dumps(event_dict) + "\n"
        with self._trace_lock:
            with open(trace_file, "a", encoding="utf-8") as f:
                f.write(line)

    def load_recent_traces(self, max_traces: int = 100, working_dir: str | None = None) -> list[TraceEvent]:
        traces_dir = self._get_traces_dir(working_dir)
        if not traces_dir.exists():
            return []

        trace_files = sorted(traces_dir.glob("trace_*.jsonl"), reverse=True)
        events: list[TraceEvent] = []

        for t_file in trace_files:
            try:
                # Read lines from newest to oldest
                lines = t_file.read_text(encoding="utf-8").splitlines()
                for line in reversed(lines):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        events.append(
                            TraceEvent(
                                timestamp=data.get("timestamp", ""),
                                task_name=data.get("task_name", "unknown"),
                                iteration=data.get("iteration", 1),
                                event_type=data.get("event_type", "iteration"),
                                prompt_sent=data.get("prompt_sent", ""),
                                agent_output=data.get("agent_output", ""),
                                exit_code=data.get("exit_code", 0),
                                passed=data.get("passed", False),
                                failed_assertions=data.get("failed_assertions", []),
                                tags=data.get("tags", []),
                            )
                        )
                        if len(events) >= max_traces:
                            break
                    except Exception:
                        continue
                if len(events) >= max_traces:
                    break
            except Exception:
                continue

        return events
