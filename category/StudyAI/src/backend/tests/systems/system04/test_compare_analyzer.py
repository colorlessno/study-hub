from __future__ import annotations

from studyai.systems.system04.services.compare_analyzer import CompareAnalyzer


def test_compare_analyzer_builds_diff_points() -> None:
    analyzer = CompareAnalyzer()

    result = analyzer.compare_products(
        product_summaries=[
            {
                "product_name": "商品A",
                "total_reviews": 10,
                "sentiment_summary": {"positive": 7, "negative": 2, "neutral": 1, "average_score": 0.6},
                "insights": {"improvements": [{"priority": "high", "issue": "battery", "suggestion": "fix it"}]},
                "strengths": ["sound"],
                "weaknesses": ["battery"],
            },
            {
                "product_name": "商品B",
                "total_reviews": 8,
                "sentiment_summary": {"positive": 3, "negative": 4, "neutral": 1, "average_score": -0.1},
                "insights": {"improvements": [{"priority": "medium", "issue": "design", "suggestion": "review"}]},
                "strengths": ["price"],
                "weaknesses": ["support"],
            },
        ]
    )

    assert result["products"][0]["product_name"] == "商品A"
    assert result["diff_points"]
    assert result["recommendations"]
