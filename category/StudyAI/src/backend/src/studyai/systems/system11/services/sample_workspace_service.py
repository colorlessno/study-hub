from __future__ import annotations

import shutil
from pathlib import Path

from studyai.common.errors.models import AppError
from studyai.systems.system11.schemas.organizer import SampleWorkspaceResponse


class SampleWorkspaceService:
    DEFAULT_FIXTURE_ROOT = Path("/mnt/organize/sample")
    DEFAULT_WORK_ROOT = Path("/mnt/organize/work")

    def __init__(self, fixture_root: Path | None = None, work_root: Path | None = None) -> None:
        self.fixture_root = (fixture_root or self.DEFAULT_FIXTURE_ROOT).resolve()
        self.work_root = (work_root or self.DEFAULT_WORK_ROOT).resolve()

    def reset(self) -> SampleWorkspaceResponse:
        if not self.fixture_root.is_dir():
            raise AppError(
                "sample_fixture_not_found",
                "教材用ファイルが見つかりません。",
                500,
                {"fixture_root": str(self.fixture_root)},
            )
        if self.work_root == Path(self.work_root.anchor):
            raise AppError("unsafe_sample_root", "教材用作業フォルダの設定が不正です。", 500)

        self.work_root.mkdir(parents=True, exist_ok=True)
        for child in self.work_root.iterdir():
            if child.is_dir() and not child.is_symlink():
                shutil.rmtree(child)
            else:
                child.unlink()

        inbox = self.work_root / "inbox"
        output = self.work_root / "organized"
        shutil.copytree(self.fixture_root, inbox)
        output.mkdir(parents=True, exist_ok=True)
        files = sorted(str(path.relative_to(inbox)).replace("\\", "/") for path in inbox.rglob("*") if path.is_file())
        return SampleWorkspaceResponse(
            watch_folder=str(inbox),
            output_folder=str(output),
            files=files,
        )
