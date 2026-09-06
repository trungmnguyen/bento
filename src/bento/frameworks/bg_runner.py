"""BackgroundTaskRunner: Manages detached background processes with PID and log tracking."""
from __future__ import annotations
import datetime
import json
import os
import signal
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any


class BackgroundTaskRunner:
    def __init__(self, base_dir: str | None = None):
        self._default_base_dir = base_dir

    def _get_bg_dir(self, working_dir: str | None = None) -> Path:
        base = Path(working_dir or self._default_base_dir or os.getcwd())
        bg_dir = base / ".bento" / "bg"
        (bg_dir / "tasks").mkdir(parents=True, exist_ok=True)
        (bg_dir / "logs").mkdir(parents=True, exist_ok=True)
        return bg_dir

    def _is_pid_alive(self, pid: int) -> bool:
        if pid <= 0:
            return False

        # Attempt to reap if it's a direct child of this process
        try:
            wpid, _ = os.waitpid(pid, os.WNOHANG)
            if wpid == pid:
                return False
        except (ChildProcessError, OSError):
            pass

        try:
            os.kill(pid, 0)
        except (OSError, ProcessLookupError):
            return False

        # Check process state via ps to filter out zombies (state Z)
        try:
            res = subprocess.run(["ps", "-p", str(pid), "-o", "stat="], capture_output=True, text=True)
            stat = res.stdout.strip()
            if not stat or "Z" in stat:
                return False
        except Exception:
            pass

        return True

    def start_task(
        self,
        command: str,
        tag: str = "task",
        working_dir: str | None = None,
    ) -> dict[str, Any]:
        bg_dir = self._get_bg_dir(working_dir)
        now_ts = int(time.time() * 1000)
        short_id = f"bg-{now_ts % 1000000:06d}-{uuid.uuid4().hex[:8]}"  # REL-12: 32-bit entropy
        
        log_file = bg_dir / "logs" / f"{short_id}.log"
        task_meta_file = bg_dir / "tasks" / f"{short_id}.json"

        # Open log file handle and write header
        with open(log_file, "w", encoding="utf-8") as f:
            f.write(f"=== Bento Background Task: {short_id} ({tag}) ===\n")
            f.write(f"Command: {command}\n")
            f.write(f"Started at: {datetime.datetime.now().isoformat()}\n")
            f.write("=" * 60 + "\n\n")

        effective_cwd = working_dir or self._default_base_dir or os.getcwd()
        log_handle = open(log_file, "a", encoding="utf-8")
        try:
            process = subprocess.Popen(
                command,
                shell=True,
                cwd=effective_cwd,
                stdout=log_handle,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
        finally:
            # REL-14: Ensure parent closes file handle even if Popen raises an exception
            log_handle.close()

        task_info = {
            "id": short_id,
            "task_id": short_id,
            "tag": tag,
            "command": command,
            "pid": process.pid,
            "cwd": effective_cwd,
            "started_at": datetime.datetime.now().isoformat(),
            "status": "RUNNING",
            "log_file": str(log_file),
        }

        task_meta_file.write_text(json.dumps(task_info, indent=2), encoding="utf-8")
        return task_info

    def list_tasks(self, working_dir: str | None = None) -> list[dict[str, Any]]:
        bg_dir = self._get_bg_dir(working_dir)
        task_files = list((bg_dir / "tasks").glob("*.json"))
        tasks: list[dict[str, Any]] = []

        for tf in sorted(task_files, reverse=True):
            try:
                info = json.loads(tf.read_text(encoding="utf-8"))
                if "task_id" not in info and "id" in info:
                    info["task_id"] = info["id"]
                elif "id" not in info and "task_id" in info:
                    info["id"] = info["task_id"]
                pid = info.get("pid", -1)
                if self._is_pid_alive(pid):
                    info["status"] = "RUNNING"
                else:
                    if info.get("status") == "RUNNING":
                        info["status"] = "STOPPED"
                tasks.append(info)
            except Exception:
                continue

        return tasks

    def get_status(self, task_id: str, working_dir: str | None = None) -> dict[str, Any] | None:
        bg_dir = self._get_bg_dir(working_dir)
        task_file = bg_dir / "tasks" / f"{task_id}.json"
        if not task_file.exists():
            return None

        try:
            info = json.loads(task_file.read_text(encoding="utf-8"))
            pid = info.get("pid", -1)
            info["is_alive"] = self._is_pid_alive(pid)
            if info["is_alive"]:
                info["status"] = "RUNNING"
            elif info.get("status") == "RUNNING":
                info["status"] = "STOPPED"
            return info
        except Exception:
            return None

    def get_logs(self, task_id: str, lines: int = 50, working_dir: str | None = None) -> str:
        bg_dir = self._get_bg_dir(working_dir)
        log_file = bg_dir / "logs" / f"{task_id}.log"
        if not log_file.exists():
            return f"No log found for task '{task_id}'."

        try:
            all_lines = log_file.read_text(encoding="utf-8", errors="replace").splitlines()
            tail = all_lines[-lines:] if len(all_lines) > lines else all_lines
            return "\n".join(tail)
        except Exception as e:
            return f"Error reading log: {e}"

    def read_log_chunk(
        self,
        task_id: str,
        start_offset: int = 0,
        working_dir: str | None = None,
    ) -> tuple[str, int, bool]:
        """Read newly appended chunk from task log starting at byte offset.

        Returns:
            (chunk_text, next_offset, is_running)
        """
        bg_dir = self._get_bg_dir(working_dir)
        log_file = bg_dir / "logs" / f"{task_id}.log"
        status = self.get_status(task_id, working_dir=working_dir)
        is_running = (status.get("status") == "RUNNING") if status else False

        if not log_file.exists():
            return "", start_offset, is_running

        try:
            with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                f.seek(start_offset)
                chunk = f.read()
                new_offset = f.tell()
                return chunk, new_offset, is_running
        except Exception:
            return "", start_offset, is_running

    def kill_task(self, task_id: str, working_dir: str | None = None) -> bool:
        status = self.get_status(task_id, working_dir=working_dir)
        if not status:
            return False

        pid = status.get("pid", -1)
        if pid <= 0:
            return True

        if not self._is_pid_alive(pid):
            return True

        try:
            pgid = os.getpgid(pid)
            os.killpg(pgid, signal.SIGTERM)
        except Exception:
            try:
                os.kill(pid, signal.SIGTERM)
            except Exception:
                pass

        time.sleep(0.5)
        if self._is_pid_alive(pid):
            try:
                pgid = os.getpgid(pid)
                os.killpg(pgid, signal.SIGKILL)
            except Exception:
                try:
                    os.kill(pid, signal.SIGKILL)
                except Exception:
                    pass

        # Update status file
        bg_dir = self._get_bg_dir(working_dir)
        task_file = bg_dir / "tasks" / f"{task_id}.json"
        if task_file.exists():
            status["status"] = "KILLED"
            task_file.write_text(json.dumps(status, indent=2), encoding="utf-8")
        return True

    def prune_tasks(self, stopped_only: bool = True, working_dir: str | None = None) -> int:
        """Prune background task metadata and associated log files."""
        bg_dir = self._get_bg_dir(working_dir)
        task_files = list((bg_dir / "tasks").glob("*.json"))
        pruned_count = 0

        for tf in task_files:
            try:
                info = json.loads(tf.read_text(encoding="utf-8"))
                pid = info.get("pid", -1)
                is_alive = self._is_pid_alive(pid)

                if stopped_only and is_alive:
                    continue

                task_id = info.get("id", tf.stem)
                # Remove task json
                tf.unlink(missing_ok=True)
                # Remove log file
                log_file = bg_dir / "logs" / f"{task_id}.log"
                if log_file.exists():
                    log_file.unlink(missing_ok=True)

                pruned_count += 1
            except Exception:
                continue

        return pruned_count
