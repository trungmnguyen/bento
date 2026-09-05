"""SubprocessExecutionGateway: Concrete driver implementing ExecutionGateway via subprocess."""
from __future__ import annotations
import os
import signal
import subprocess
import time
from bento.domain.ports import ExecutionGateway


class SubprocessExecutionGateway(ExecutionGateway):
    def execute_command(
        self,
        command: str,
        cwd: str | None = None,
        env: dict[str, str] | None = None,
        timeout_sec: float = 30.0,
    ) -> tuple[int, str, str, float]:
        merged_env = os.environ.copy()
        if env:
            merged_env.update(env)

        start_time = time.monotonic()
        proc = None
        try:
            proc = subprocess.Popen(
                command,
                shell=True,
                cwd=cwd,
                env=merged_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                start_new_session=True,
            )
            stdout, stderr = proc.communicate(timeout=timeout_sec)
            duration_ms = (time.monotonic() - start_time) * 1000.0
            return (
                proc.returncode,
                stdout or "",
                stderr or "",
                duration_ms,
            )
        except subprocess.TimeoutExpired:
            duration_ms = (time.monotonic() - start_time) * 1000.0
            stdout, stderr = "", ""
            if proc:
                try:
                    pgid = os.getpgid(proc.pid)
                    os.killpg(pgid, signal.SIGTERM)
                    time.sleep(0.05)
                    os.killpg(pgid, signal.SIGKILL)
                except (ProcessLookupError, OSError):
                    pass
                try:
                    proc.kill()
                except (ProcessLookupError, OSError):
                    pass
                try:
                    out_bytes, err_bytes = proc.communicate(timeout=1.0)
                    stdout = out_bytes or ""
                    stderr = err_bytes or ""
                except Exception:
                    pass
            stderr_msg = f"Execution timed out after {timeout_sec} seconds"
            if stderr:
                stderr_msg = f"{stderr_msg}\n{stderr}"
            return -1, stdout, stderr_msg, duration_ms
        except Exception as e:
            duration_ms = (time.monotonic() - start_time) * 1000.0
            if proc:
                try:
                    proc.kill()
                except Exception:
                    pass
            return -1, "", str(e), duration_ms

