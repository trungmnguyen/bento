"""AmbientWatcher: Lightweight, dependency-free file watcher for continuous contract verification."""
from __future__ import annotations
import os
import time
from pathlib import Path
from typing import Callable


class AmbientWatcher:
    def __init__(self, watch_dir: str = ".", debounce_sec: float = 0.5):
        self.watch_dir = Path(watch_dir)
        self.debounce_sec = debounce_sec
        self._last_mtimes: dict[str, float] = {}

    def _scan_directory(self) -> dict[str, float]:
        mtimes: dict[str, float] = {}
        # Scan code files (py, json, yaml, md)
        for root, dirs, files in os.walk(self.watch_dir):
            # Ignore git, cache, venv directories
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in {"__pycache__", "build", "dist", "venv", ".venv"}]
            for f in files:
                if f.endswith((".py", ".json", ".yaml", ".yml", ".md")):
                    p = os.path.join(root, f)
                    try:
                        mtimes[p] = os.stat(p).st_mtime
                    except (OSError, FileNotFoundError):
                        continue
        return mtimes

    def check_for_changes(self) -> list[str]:
        current_mtimes = self._scan_directory()
        changed: list[str] = []

        if not self._last_mtimes:
            self._last_mtimes = current_mtimes
            return []

        for path, mtime in current_mtimes.items():
            if path not in self._last_mtimes or mtime > self._last_mtimes[path]:
                changed.append(path)

        self._last_mtimes = current_mtimes
        return changed

    def run_watch_loop(
        self,
        on_change_callback: Callable[[list[str]], None],
        max_cycles: int | None = None,
        poll_interval: float = 0.5,
    ) -> None:
        """Runs the ambient watching loop. Runs indefinitely if max_cycles is None."""
        self._last_mtimes = self._scan_directory()
        cycles = 0

        while max_cycles is None or cycles < max_cycles:
            cycles += 1
            time.sleep(poll_interval)
            changed = self.check_for_changes()
            if changed:
                time.sleep(self.debounce_sec)
                on_change_callback(changed)
