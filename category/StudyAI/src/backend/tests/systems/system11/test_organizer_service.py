from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path

import pytest
from pydantic import ValidationError

from studyai.systems.system11.schemas.organizer import SettingsRequest
from studyai.systems.system11.services.execution_service import ExecutionService
from studyai.systems.system11.services.path_safety_service import PathSafetyService
from studyai.systems.system11.services.plan_generator import PlanGenerator
from studyai.systems.system11.services.rollback_service import RollbackService
from studyai.systems.system11.services.sample_workspace_service import SampleWorkspaceService
from studyai.systems.system11.services.scan_service import ScanService


# ---------- PathSafetyService ----------

class TestPathSafetyService:
    def setup_method(self):
        self.service = PathSafetyService()

    def test_forbidden_extension(self):
        assert self.service.is_forbidden_extension(Path("C:/foo/bar.exe")) is True
        assert self.service.is_forbidden_extension(Path("C:/foo/bar.bat")) is True
        assert self.service.is_forbidden_extension(Path("C:/foo/bar.pdf")) is False

    def test_validate_scope_allowed(self, tmp_path):
        target = tmp_path / "sub" / "file.txt"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.touch()
        # should not raise
        self.service.validate_scope(target.resolve(), [tmp_path.resolve()])

    def test_validate_scope_denied(self, tmp_path):
        from studyai.common.errors.models import AppError
        other = Path(tempfile.mkdtemp())
        target = other / "file.txt"
        target.touch()
        with pytest.raises(AppError) as exc_info:
            self.service.validate_scope(target.resolve(), [tmp_path.resolve()])
        assert exc_info.value.error_code == "unsafe_path_detected"

    def test_matches_exclude(self, tmp_path):
        file_path = tmp_path / "node_modules" / "package.json"
        assert self.service.matches_exclude(file_path, ["node_modules"]) is True
        assert self.service.matches_exclude(file_path, [".git"]) is False


# ---------- ScanService ----------

class TestScanService:
    def setup_method(self):
        self.service = ScanService()

    def test_collect_files_basic(self, tmp_path):
        self.service = ScanService(PathSafetyService(tmp_path))
        (tmp_path / "a.txt").write_text("hello", encoding="utf-8")
        (tmp_path / "b.py").write_text("print(1)", encoding="utf-8")
        results = self.service.collect_files([str(tmp_path)], [])
        assert len(results) == 2
        paths = [r["path"] for r in results]
        assert any("a.txt" in p for p in paths)
        assert any("b.py" in p for p in paths)

    def test_collect_files_excludes(self, tmp_path):
        self.service = ScanService(PathSafetyService(tmp_path))
        (tmp_path / "keep.txt").write_text("keep", encoding="utf-8")
        (tmp_path / "skip.log").write_text("skip", encoding="utf-8")
        results = self.service.collect_files([str(tmp_path)], ["*.log"])
        assert all("skip.log" not in r["path"] for r in results)

    def test_collect_files_forbidden_extension(self, tmp_path):
        self.service = ScanService(PathSafetyService(tmp_path))
        (tmp_path / "setup.exe").write_bytes(b"MZ")
        results = self.service.collect_files([str(tmp_path)], [])
        exe_results = [r for r in results if r["path"].endswith(".exe")]
        assert all(r["is_forbidden"] for r in exe_results)


# ---------- ExecutionService ----------

class TestExecutionService:
    def setup_method(self):
        self.service = ExecutionService()

    def test_execute_move_success(self, tmp_path):
        src = tmp_path / "source.txt"
        src.write_text("content", encoding="utf-8")
        dest = tmp_path / "dest" / "source.txt"
        action = {
            "action_id": "act1",
            "action_type": "move",
            "source_path": str(src),
            "dest_path": str(dest),
        }
        results = self.service.execute_actions([action], [tmp_path.resolve()])
        assert results[0]["status"] == "success"
        assert dest.exists()
        assert not src.exists()

    def test_execute_move_conflict(self, tmp_path):
        src = tmp_path / "source.txt"
        src.write_text("content", encoding="utf-8")
        dest = tmp_path / "dest.txt"
        dest.write_text("existing", encoding="utf-8")
        action = {
            "action_id": "act2",
            "action_type": "move",
            "source_path": str(src),
            "dest_path": str(dest),
        }
        results = self.service.execute_actions([action], [tmp_path.resolve()])
        assert results[0]["status"] == "conflict"
        assert results[0]["error_code"] == "name_conflict"

    def test_execute_rename_success(self, tmp_path):
        src = tmp_path / "old_name.txt"
        src.write_text("content", encoding="utf-8")
        action = {
            "action_id": "act3",
            "action_type": "rename",
            "source_path": str(src),
            "new_name": "new_name.txt",
        }
        results = self.service.execute_actions([action], [tmp_path.resolve()])
        assert results[0]["status"] == "success"
        assert (tmp_path / "new_name.txt").exists()

    def test_execute_keep_skipped(self, tmp_path):
        src = tmp_path / "file.txt"
        src.write_text("x", encoding="utf-8")
        action = {
            "action_id": "act4",
            "action_type": "keep",
            "source_path": str(src),
        }
        results = self.service.execute_actions([action], [tmp_path.resolve()])
        assert results[0]["status"] == "skipped_by_policy"

    def test_execute_forbidden_extension_skipped(self, tmp_path):
        src = tmp_path / "setup.exe"
        src.write_bytes(b"MZ")
        action = {
            "action_id": "act5",
            "action_type": "move",
            "source_path": str(src),
            "dest_path": str(tmp_path / "dest" / "setup.exe"),
        }
        results = self.service.execute_actions([action], [tmp_path.resolve()])
        assert results[0]["status"] == "skipped_by_policy"
        assert results[0]["error_code"] == "forbidden_extension"


# ---------- RollbackService ----------

class TestRollbackService:
    def setup_method(self):
        self.service = RollbackService()

    def test_rollback_move(self, tmp_path):
        original = tmp_path / "original.txt"
        moved = tmp_path / "moved.txt"
        moved.write_text("content", encoding="utf-8")

        rollback_data = [{
            "action_id": "act1",
            "action_type": "move",
            "source_path": str(original),
            "target_path": str(moved),
        }]
        results = self.service.rollback_items(rollback_data, allowed_roots=[tmp_path.resolve()])
        assert results[0]["status"] == "reverted"
        assert original.exists()
        assert not moved.exists()

    def test_rollback_target_not_found(self, tmp_path):
        rollback_data = [{
            "action_id": "act2",
            "action_type": "move",
            "source_path": str(tmp_path / "original.txt"),
            "target_path": str(tmp_path / "nonexistent.txt"),
        }]
        results = self.service.rollback_items(rollback_data, allowed_roots=[tmp_path.resolve()])
        assert results[0]["error_code"] == "target_not_found"


# ---------- Schema ----------

class TestSettingsSchema:
    def test_settings_request_accepts_manual_preview(self):
        req = SettingsRequest(schedule="manual", mode="preview")
        assert req.schedule == "manual"

    def test_settings_request_rejects_automatic_schedule(self):
        with pytest.raises(ValidationError):
            SettingsRequest(schedule="daily")

    def test_settings_request_rejects_execute_mode(self):
        with pytest.raises(ValidationError):
            SettingsRequest(mode="execute")


class TestSampleWorkspaceService:
    def test_reset_recreates_only_the_dedicated_workspace(self, tmp_path):
        fixtures = tmp_path / "fixtures"
        work = tmp_path / "work"
        fixtures.mkdir()
        work.mkdir()
        (fixtures / "meeting notes.txt").write_text("sample", encoding="utf-8")
        (work / "old.txt").write_text("old", encoding="utf-8")

        response = SampleWorkspaceService(fixtures, work).reset()

        assert response.watch_folder == str(work / "inbox")
        assert response.output_folder == str(work / "organized")
        assert response.files == ["meeting notes.txt"]
        assert not (work / "old.txt").exists()
        assert (work / "inbox" / "meeting notes.txt").is_file()


class BrokenLLMClient:
    async def extract_json(self, _system_prompt: str, _user_prompt: str) -> dict:
        raise RuntimeError("offline")


class UnsafeLLMClient:
    async def extract_json(self, _system_prompt: str, _user_prompt: str) -> dict:
        return {
            "summary": "unsafe",
            "actions": [{
                "action_id": "unsafe-1",
                "action_type": "move",
                "source_path": "/workspace/inbox/document.txt",
                "dest_path": "/outside/document.txt",
                "reason": "outside",
                "confidence": 1,
            }],
        }


class TestPlanGenerator:
    def test_uses_local_rules_when_llm_is_unavailable(self):
        generator = PlanGenerator(BrokenLLMClient())
        result = asyncio.run(generator.generate_plan(
            [{
                "path": "/workspace/inbox/meeting notes.txt",
                "ext": ".txt",
                "size_kb": 1,
                "days_since_access": 0,
                "preview": "sample",
                "is_forbidden": False,
            }],
            "/workspace/organized",
        ))

        _summary_text, actions, summary, planning_method = result
        assert planning_method == "local_rules"
        assert actions[0].action_type == "rename"
        assert actions[0].new_name == "meeting-notes.txt"
        assert summary.renames == 1

    def test_rejects_llm_destination_outside_output_folder(self):
        generator = PlanGenerator(UnsafeLLMClient())
        result = asyncio.run(generator.generate_plan(
            [{
                "path": "/workspace/inbox/document.txt",
                "ext": ".txt",
                "size_kb": 1,
                "days_since_access": 0,
                "preview": "sample",
                "is_forbidden": False,
            }],
            "/workspace/organized",
        ))

        _summary_text, actions, _summary, planning_method = result
        assert planning_method == "llm"
        assert actions[0].action_type == "keep"
        assert actions[0].dest_path is None
