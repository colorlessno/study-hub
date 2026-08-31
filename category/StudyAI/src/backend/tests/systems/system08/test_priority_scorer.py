from __future__ import annotations

from studyai.systems.system08.services.priority_scorer import PriorityScorer


def test_priority_scorer_assigns_quadrants_and_order() -> None:
    tasks = [
        {"task_no": 1, "name": "A", "description": "a", "urgency": "high", "importance": "high"},
        {"task_no": 2, "name": "B", "description": "b", "urgency": "low", "importance": "high"},
        {"task_no": 3, "name": "C", "description": "c", "urgency": "high", "importance": "low"},
    ]

    scored, summary = PriorityScorer().score_tasks(tasks)

    assert scored[0]["priority"] == "high"
    assert scored[0]["quadrant"] == "第1象限"
    assert summary["quadrant_1"] == [1]
    assert summary["quadrant_2"] == [2]
    assert summary["quadrant_3"] == [3]
    assert summary["recommended_order"][:3] == [1, 2, 3]
