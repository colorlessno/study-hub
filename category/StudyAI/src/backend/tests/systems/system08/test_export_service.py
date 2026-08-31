from __future__ import annotations

from types import SimpleNamespace

from studyai.systems.system08.services.export_service import ExportService


def test_export_service_outputs_markdown_csv_json() -> None:
    analysis = SimpleNamespace(
        id=11,
        theme="新規学習テーマ",
        summary="概要",
        search_count=3,
        priority_summary={"recommended_order": [1]},
        tasks=[
            SimpleNamespace(
                id=101,
                task_no=1,
                name="調査する",
                description="現状を調べる",
                category="情報収集",
                priority="high",
                quadrant="第1象限",
                status="todo",
                estimated_hours=2.5,
                dependencies=[],
                references=[{"title": "記事", "url": "https://example.com"}],
            )
        ],
    )

    service = ExportService()
    markdown = service.export_markdown(analysis)
    csv_text = service.export_csv(analysis)
    json_text = service.export_json(analysis)

    assert "# 新規学習テーマ" in markdown
    assert "調査する" in markdown
    assert "task_no,name,category,priority" in csv_text
    assert "調査する" in csv_text
    assert "\"theme\": \"新規学習テーマ\"" in json_text
