from __future__ import annotations

from studyai.systems.system14.services.utterance_analyzer import UtteranceAnalyzer


def test_utterance_analyzer_classifies_complaint() -> None:
    analyzer = UtteranceAnalyzer()

    result = analyzer.analyze_utterance(speaker="customer", text="配送が遅いので困っています。返品できますか？")

    assert result["sentiment"] == "negative"
    assert result["sentiment_score"] < 0
    assert result["utterance_type"] == "クレーム"
    assert "配送" in result["topics"]


def test_utterance_analyzer_classifies_praise() -> None:
    analyzer = UtteranceAnalyzer()

    result = analyzer.analyze_utterance(speaker="customer", text="サポート対応が良いので満足しています")

    assert result["sentiment"] == "positive"
    assert result["utterance_type"] == "お褒め"
    assert "サポート" in result["topics"]
