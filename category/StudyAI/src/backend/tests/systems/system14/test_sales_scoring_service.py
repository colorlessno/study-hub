from __future__ import annotations

from studyai.systems.system14.services.sales_scoring_service import SalesScoringService


def test_sales_scoring_service_scores_conversation() -> None:
    score = SalesScoringService().score_sales_conversation(
        [
            {"speaker": "staff", "text": "課題はいつから発生していますか？"},
            {"speaker": "customer", "text": "先月からです"},
            {"speaker": "staff", "text": "改善プランを提案し、次回見積を送付します"},
        ],
        {"staff_id": "staff_001", "staff_name": "中村"},
    )

    assert score["staff_id"] == "staff_001"
    assert score["overall_score"] > 0
    assert score["issue_exploration"] > 30
    assert score["proposal_quality"] > 30
    assert score["next_step_clarity"] > 30
    assert score["top_questions"][0]["question_type"] == "課題深掘り"
