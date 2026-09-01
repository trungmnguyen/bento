"""SubprocessExecutionGateway: Concrete driver implementing ExecutionGateway via subprocess."""
from __future__ import annotations
import os
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
        try:
            process = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                env=merged_env,
                capture_output=True,
                text=True,
                timeout=timeout_sec,
            )
            duration_ms = (time.monotonic() - start_time) * 1000.0
            return (
                process.returncode,
                process.stdout or "",
                process.stderr or "",
                duration_ms,
            )
        except subprocess.TimeoutExpired as te:
            duration_ms = (time.monotonic() - start_time) * 1000.0
            stdout = te.stdout.decode() if isinstance(te.stdout, bytes) else (te.stdout or "")
            stderr = f"Execution timed out after {timeout_sec} seconds"
            return -1, stdout, stderr, duration_ms
        except Exception as e:
            duration_ms = (time.monotonic() - start_time) * 1000.0
            return -1, "", str(e), duration_ms
