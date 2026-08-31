from __future__ import annotations


class SentimentAnalyzer:
    _POSITIVE_KEYWORDS = ("良い", "最高", "満足", "おすすめ", "使いやすい", "great", "good", "excellent", "love")
    _NEGATIVE_KEYWORDS = ("悪い", "不満", "壊れ", "返品", "最悪", "使いにくい", "bad", "poor", "terrible", "hate")

    def classify_sentiment(self, *, text: str, score: float | None) -> dict:
        text_lower = text.lower()
        score_hint = 0.0
        if score is not None:
            score_hint = (score - 3.0) / 2.0

        keyword_hint = 0.0
        if any(keyword in text_lower for keyword in self._POSITIVE_KEYWORDS):
            keyword_hint += 0.35
        if any(keyword in text_lower for keyword in self._NEGATIVE_KEYWORDS):
            keyword_hint -= 0.35

        combined = max(-1.0, min(1.0, score_hint + keyword_hint))
        if combined >= 0.25:
            sentiment = "positive"
        elif combined <= -0.25:
            sentiment = "negative"
        else:
            sentiment = "neutral"

        absolute = abs(combined)
        if absolute >= 0.7:
            intensity = "strong"
        elif absolute >= 0.35:
            intensity = "medium"
        else:
            intensity = "weak"

        return {
            "sentiment": sentiment,
            "sentiment_score": round(combined, 2),
            "intensity": intensity,
        }
