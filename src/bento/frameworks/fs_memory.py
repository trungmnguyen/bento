"""FileSystemMemoryGateway: Concrete driver implementing MemoryGateway via local filesystem storage."""
from __future__ import annotations
import json
import os
import shutil
import time
from pathlib import Path
from bento.domain.models import MemoryBank, MemoryLesson, Scenario
from bento.domain.ports import MemoryGateway


class FileSystemMemoryGateway(MemoryGateway):
    def __init__(self, base_dir: str | None = None):
        self._default_base_dir = base_dir

    def _get_bento_dir(self, working_dir: str | None = None) -> Path:
        base = Path(working_dir or self._default_base_dir or os.getcwd())
        bento_path = base / ".bento"
        bento_path.mkdir(parents=True, exist_ok=True)
        return bento_path

    def load_memory(self, working_dir: str | None = None) -> MemoryBank:
        bento_dir = self._get_bento_dir(working_dir)
        json_file = bento_dir / "memory" / "lessons.json"

        if not json_file.exists():
            return MemoryBank(lessons=[])

        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            lessons = []
            for item in data.get("lessons", []):
                lessons.append(
                    MemoryLesson(
                        id=item["id"],
                        title=item["title"],
                        category=item.get("category", "general"),
                        context=item.get("context", ""),
                        rule=item["rule"],
                        anti_pattern=item.get("anti_pattern", ""),
                        discovery_date=item.get("discovery_date", ""),
                        tags=item.get("tags", []),
                        source_scenario=item.get("source_scenario", ""),
                    )
                )
            return MemoryBank(
                lessons=lessons,
                version=data.get("version", "1.0"),
                updated_at=data.get("updated_at", ""),
            )
        except Exception as e:
            if json_file.exists() and json_file.stat().st_size > 0:
                backup_file = bento_dir / "memory" / f"lessons.json.corrupted.{int(time.time())}.bak"
                try:
                    shutil.copy2(json_file, backup_file)
                except Exception:
                    pass
                raise ValueError(
                    f"Institutional memory file '{json_file}' is corrupted: {e}. "
                    f"A backup was preserved at '{backup_file}'. Refusing to overwrite memory bank."
                )
            return MemoryBank(lessons=[])

    def save_memory(self, memory: MemoryBank, working_dir: str | None = None) -> None:
        bento_dir = self._get_bento_dir(working_dir)
        memory_dir = bento_dir / "memory"
        memory_dir.mkdir(parents=True, exist_ok=True)

        # 1. Save JSON
        json_file = memory_dir / "lessons.json"
        raw_lessons = [l.__dict__ for l in memory.lessons]
        payload = {
            "version": memory.version,
            "updated_at": memory.updated_at,
            "lessons": raw_lessons,
        }
        self._atomic_write_text(json_file, json.dumps(payload, indent=2))

        # 2. Save Human-Readable Markdown (MEMORY.md)
        md_file = bento_dir / "MEMORY.md"
        lines = [
            "# 🧠 Bento Persistent Memory Bank",
            "",
            f"> Auto-distilled architectural rules and edge-case guards ({len(memory.lessons)} rules stored).",
            "",
        ]
        for l in memory.lessons:
            lines.append(f"### `[{l.id}]` {l.title}")
            lines.append(f"- **Category:** `{l.category}` | **Discovered:** {l.discovery_date}")
            lines.append(f"- **Hard Rule:** {l.rule}")
            if l.anti_pattern:
                lines.append(f"- **Anti-Pattern:** {l.anti_pattern}")
            if l.tags:
                lines.append(f"- **Tags:** {', '.join(l.tags)}")
            lines.append("")

        self._atomic_write_text(md_file, "\n".join(lines))

    def _atomic_write_text(self, path: Path, content: str) -> None:
        import tempfile
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=path.parent,
                prefix=f"{path.name}.tmp.",
                delete=False,
            ) as tf:
                temp_path = Path(tf.name)
                tf.write(content)
                tf.flush()
                os.fsync(tf.fileno())
            os.replace(temp_path, path)
        except Exception:
            if temp_path and temp_path.exists():
                try:
                    temp_path.unlink()
                except Exception:
                    pass
            raise

    def save_regression_scenario(self, scenario: Scenario, working_dir: str | None = None) -> str:
        bento_dir = self._get_bento_dir(working_dir)
        reg_dir = bento_dir / "regressions"
        reg_dir.mkdir(parents=True, exist_ok=True)

        safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in scenario.name.lower())
        file_path = reg_dir / f"{safe_name}.json"

        # Serialize scenario to JSON
        steps_data = []
        for s in scenario.steps:
            assertions_data = [
                {
                    "type": a.type.value,
                    "expected": a.expected,
                    "target_field": a.target_field,
                    "description": a.description,
                }
                for a in s.assertions
            ]
            steps_data.append(
                {
                    "name": s.name,
                    "command": s.command,
                    "timeout_sec": s.timeout_sec,
                    "assertions": assertions_data,
                }
            )

        scenario_dict = {
            "name": scenario.name,
            "description": scenario.description,
            "tags": scenario.tags,
            "steps": steps_data,
            "metadata": scenario.metadata,
        }

        file_path.write_text(json.dumps(scenario_dict, indent=2), encoding="utf-8")
        return str(file_path)
