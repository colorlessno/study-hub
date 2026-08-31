from __future__ import annotations

from studyai.systems.system13.services.checklist_service import ChecklistService


def test_build_default_items_for_developer() -> None:
    items = ChecklistService.build_default_items(
        project_id="proj-1",
        user_id="user-1",
        role="developer",
    )
    assert len(items) == 4
    assert items[0]["status"] == "pending"
    assert items[0]["title"] == "プロジェクト概要と設計文書を確認する"
    assert items[0]["category"] == "文書"
    assert items[-1]["category"] == "リスク"
