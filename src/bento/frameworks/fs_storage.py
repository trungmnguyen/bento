"""FileSystemStorageGateway: Concrete driver implementing StorageGateway via local filesystem."""
from __future__ import annotations
import glob
import os
from pathlib import Path
from bento.domain.ports import StorageGateway


class FileSystemStorageGateway(StorageGateway):
    def read_text(self, path: str) -> str:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def write_text(self, path: str, content: str) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)

    def list_files(self, directory: str, pattern: str = "*") -> list[str]:
        search_path = os.path.join(directory, pattern)
        return glob.glob(search_path)

    def file_exists(self, path: str) -> bool:
        return os.path.exists(path)
