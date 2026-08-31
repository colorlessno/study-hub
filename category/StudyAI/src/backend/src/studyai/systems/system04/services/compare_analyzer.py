from __future__ import annotations


class CompareAnalyzer:
    def compare_products(self, *, product_summaries: list[dict]) -> dict:
        diff_points = []
        recommendations = []
        for index, left in enumerate(product_summaries):
            for right in product_summaries[index + 1 :]:
                delta = left["sentiment_summary"]["average_score"] - right["sentiment_summary"]["average_score"]
                if abs(delta) < 0.1:
                    continue
                better_product = left["product_name"] if delta > 0 else right["product_name"]
                worse_product = right["product_name"] if delta > 0 else left["product_name"]
                diff_points.append(
                    {
                        "topic": "overall_sentiment",
                        "summary": f"{better_product} has stronger overall review sentiment than {worse_product}.",
                        "better_product": better_product,
                    }
                )
        for summary in product_summaries:
            recommendations.extend(summary.get("insights", {}).get("improvements", []))
        return {
            "products": [
                {
                    "product_name": summary["product_name"],
                    "total_reviews": summary["total_reviews"],
                    "sentiment_summary": summary["sentiment_summary"],
                    "strengths": summary.get("strengths", []),
                    "weaknesses": summary.get("weaknesses", []),
                }
                for summary in product_summaries
            ],
            "diff_points": diff_points[:5],
            "recommendations": recommendations[:5],
        }
