"""SubprocessWorktreeGateway: Concrete driver implementing WorktreeGateway via git worktree."""
from __future__ import annotations
import os
import subprocess
from bento.domain.ports import WorktreeGateway


class SubprocessWorktreeGateway(WorktreeGateway):
    def create_worktree(self, branch_name: str, path: str) -> bool:
        try:
            cmd = ["git", "worktree", "add", "-b", branch_name, path]
            res = subprocess.run(cmd, capture_output=True, text=True)
            return res.returncode == 0
        except Exception:
            return False

    def remove_worktree(self, path: str) -> bool:
        try:
            cmd = ["git", "worktree", "remove", "--force", path]
            res = subprocess.run(cmd, capture_output=True, text=True)
            return res.returncode == 0
        except Exception:
            return False

    def merge_branch(self, branch_name: str) -> bool:
        try:
            cmd = ["git", "merge", "--no-ff", "-m", f"Merge verified swarm branch '{branch_name}'", branch_name]
            res = subprocess.run(cmd, capture_output=True, text=True)
            return res.returncode == 0
        except Exception:
            return False
