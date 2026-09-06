"""FileSystemStorageGateway: Concrete driver implementing StorageGateway via local filesystem."""
from __future__ import annotations
import glob
import os
from pathlib import Path
from bento.domain.ports import StorageGateway


class FileSystemStorageGateway(StorageGateway):
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._base_dir = Path(base_dir).resolve() if base_dir else None

    def read_text(self, path: str) -> str:
        p = Path(path).resolve()
        if self._base_dir and not p.is_relative_to(self._base_dir):
            raise PermissionError(f"Access denied: Path '{path}' escapes workspace boundary '{self._base_dir}'.")
        with open(p, "r", encoding="utf-8") as f:
            return f.read()

    def write_text(self, path: str, content: str) -> None:
        p = Path(path).resolve()
        if self._base_dir and not p.is_relative_to(self._base_dir):
            raise PermissionError(f"Access denied: Path '{path}' escapes workspace boundary '{self._base_dir}'.")
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)

    def list_files(self, directory: str, pattern: str = "*") -> list[str]:
        p = Path(directory).resolve()
        if self._base_dir and not p.is_relative_to(self._base_dir):
            raise PermissionError(f"Access denied: Directory '{directory}' escapes workspace boundary '{self._base_dir}'.")
        search_path = os.path.join(directory, pattern)
        return glob.glob(search_path, recursive=True)

    def file_exists(self, path: str) -> bool:
        p = Path(path).resolve()
        if self._base_dir and not p.is_relative_to(self._base_dir):
            return False
        return os.path.exists(path)
