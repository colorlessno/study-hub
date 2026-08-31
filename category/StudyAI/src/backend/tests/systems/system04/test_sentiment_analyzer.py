from __future__ import annotations

from studyai.systems.system04.services.sentiment_analyzer import SentimentAnalyzer


def test_sentiment_analyzer_uses_score_and_text() -> None:
    analyzer = SentimentAnalyzer()

    positive = analyzer.classify_sentiment(text="音質が最高でとても満足", score=5)
    negative = analyzer.classify_sentiment(text="バッテリーが悪いし返品したい", score=1)

    assert positive["sentiment"] == "positive"
    assert positive["sentiment_score"] > 0
    assert negative["sentiment"] == "negative"
    assert negative["sentiment_score"] < 0
