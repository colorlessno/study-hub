from datetime import datetime, timezone
from types import SimpleNamespace

from studyai.systems.system08.services.analysis_service import AnalysisService


def test_analysis_response_separates_display_number_from_database_id() -> None:
    task = SimpleNamespace(
        id=10,
        task_no=1,
        name="現状確認",
        description="前提を整理する",
        category="調査",
        priority="high",
        urgency="high",
        importance="high",
        quadrant="第1象限",
        dependencies=[],
        estimated_hours=1,
        assignee_skill="調査",
        cautions=None,
        references=[],
        confidence="high",
        status="todo",
        note=None,
    )
    analysis = SimpleNamespace(
        id=2,
        theme="機能改善",
        search_count=0,
        search_queries=[],
        tasks=[task],
        priority_summary={},
        markdown="",
        total_tasks=1,
        total_estimated_hours=1,
        status="completed",
        created_at=datetime.now(timezone.utc),
    )

    response = AnalysisService.__new__(AnalysisService)._to_analysis_response(analysis)

    assert response.tasks[0].task_id == 10
    assert response.tasks[0].task_no == 1
