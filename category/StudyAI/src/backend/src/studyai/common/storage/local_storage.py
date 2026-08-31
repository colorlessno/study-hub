from __future__ import annotations

from pathlib import Path


class LocalStorage:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def write_bytes(self, relative_path: str, content: bytes) -> Path:
        path = self.base_dir / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def delete(self, path: Path) -> None:
        if path.exists():
            path.unlink()
