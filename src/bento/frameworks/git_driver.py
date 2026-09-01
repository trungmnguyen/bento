"""Concrete Git Gateway for Bento."""
from __future__ import annotations
import subprocess
from bento.domain.ports import GitGateway


class SubprocessGitGateway(GitGateway):
    def commit_changes(self, message: str, working_dir: str | None = None) -> bool:
        try:
            # Stage all changes
            add_res = subprocess.run(
                ["git", "add", "."],
                cwd=working_dir,
                capture_output=True,
                text=True,
            )
            if add_res.returncode != 0:
                return False

            # Commit
            commit_res = subprocess.run(
                ["git", "commit", "-m", message],
                cwd=working_dir,
                capture_output=True,
                text=True,
            )
            return commit_res.returncode == 0
        except Exception:
            return False
