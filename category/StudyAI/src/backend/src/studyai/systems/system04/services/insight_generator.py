from __future__ import annotations


class InsightGenerator:
    def generate_insight(self, *, product_name: str, analyzed_reviews: list[dict], topics: list[dict]) -> dict:
        positive_reviews = [review for review in analyzed_reviews if review["sentiment"] == "positive"]
        negative_reviews = [review for review in analyzed_reviews if review["sentiment"] == "negative"]
        improvements = []
        for topic in topics:
            if topic["negative_count"] <= 0:
                continue
            priority = "high" if topic["negative_count"] >= 3 else "medium"
            improvements.append(
                {
                    "priority": priority,
                    "issue": topic["topic"],
                    "suggestion": f"Review recurring feedback around {topic['topic']} for {product_name} and address the cause first.",
                }
            )

        return {
            "positive_summary": self._build_summary(product_name, positive_reviews, "positive"),
            "negative_summary": self._build_summary(product_name, negative_reviews, "negative"),
            "keywords": {
                "positive": self._keywords(positive_reviews),
                "negative": self._keywords(negative_reviews),
            },
            "improvements": improvements[:5],
            "representative_reviews": {
                "positive": [review["text"] for review in positive_reviews[:3]],
                "negative": [review["text"] for review in negative_reviews[:3]],
            },
            "trend_analysis": self._build_trend(analyzed_reviews),
        }

    @staticmethod
    def _build_summary(product_name: str, reviews: list[dict], sentiment: str) -> str:
        if not reviews:
            if sentiment == "positive":
                return f"No strong positive trend was detected for {product_name}."
            return f"No major negative trend was detected for {product_name}."
        dominant_topics: list[str] = []
        for review in reviews:
            dominant_topics.extend(review["topics"])
        unique_topics = list(dict.fromkeys(dominant_topics))[:3]
        if sentiment == "positive":
            return f"{product_name} is positively mentioned for {', '.join(unique_topics)}."
        return f"Negative feedback for {product_name} is concentrated around {', '.join(unique_topics)}."

    @staticmethod
    def _keywords(reviews: list[dict]) -> list[str]:
        keywords: list[str] = []
        for review in reviews:
            for token in review["text"].replace("。", " ").replace(",", " ").split():
                cleaned = token.strip().lower()
                if len(cleaned) >= 3 and cleaned not in keywords:
                    keywords.append(cleaned)
                if len(keywords) >= 5:
                    return keywords
        return keywords

    @staticmethod
    def _build_trend(reviews: list[dict]) -> str | None:
        dated_reviews = [review for review in reviews if review.get("review_date") is not None]
        if len(dated_reviews) < 2:
            return None
        dated_reviews.sort(key=lambda item: item["review_date"])
        earlier = dated_reviews[: max(1, len(dated_reviews) // 2)]
        later = dated_reviews[max(1, len(dated_reviews) // 2) :]
        earlier_score = sum(review["sentiment_score"] for review in earlier) / len(earlier)
        later_score = sum(review["sentiment_score"] for review in later) / len(later)
        if later_score > earlier_score:
            return "Sentiment is improving over time."
        if later_score < earlier_score:
            return "Sentiment is declining over time."
        return "Sentiment trend is stable over time."
