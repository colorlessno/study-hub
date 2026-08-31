from __future__ import annotations

import re


class UtteranceAnalyzer:
    POSITIVE_KEYWORDS = ("ありがとう", "助か", "満足", "良い", "よい", "便利", "すばらしい", "改善した")
    NEGATIVE_KEYWORDS = ("困", "不満", "悪い", "遅い", "高い", "壊", "返品", "解約", "クレーム", "使えない", "不具合")
    REQUEST_KEYWORDS = ("してほしい", "できるよう", "改善", "要望", "欲しい", "ほしい", "追加")
    QUESTION_KEYWORDS = ("？", "?", "ですか", "ますか", "どう", "なぜ", "いつ", "どこ", "教えて")
    COMPLAINT_KEYWORDS = ("クレーム", "困", "不満", "返品", "解約", "壊", "使えない", "遅い")
    PRAISE_KEYWORDS = ("ありがとう", "助か", "満足", "良い", "よい", "便利", "すばらしい")
    URGENT_KEYWORDS = ("至急", "すぐ", "緊急", "法的", "炎上", "返金", "個人情報", "漏洩")

    TOPIC_PATTERNS = {
        "価格": ("価格", "料金", "値段", "高い", "安い", "費用"),
        "配送": ("配送", "発送", "納期", "届", "遅配"),
        "品質": ("品質", "不具合", "壊", "故障", "動作", "使えない"),
        "操作性": ("操作", "使い方", "使いやす", "画面", "UI"),
        "サポート": ("対応", "サポート", "問い合わせ", "電話", "チャット"),
        "契約": ("契約", "解約", "更新", "請求"),
    }

    def analyze_utterance(self, *, speaker: str | None, text: str) -> dict:
        normalized = text.strip()
        sentiment, score = self._classify_sentiment(normalized)
        utterance_type = self._classify_type(normalized)
        return {
            "speaker": speaker or "unknown",
            "text": normalized,
            "sentiment": sentiment,
            "sentiment_score": score,
            "utterance_type": utterance_type,
            "topics": self.extract_topics(normalized),
            "urgency": "high" if any(keyword in normalized for keyword in self.URGENT_KEYWORDS) else "low",
        }

    def extract_topics(self, text: str) -> list[str]:
        topics: list[str] = []
        for topic, keywords in self.TOPIC_PATTERNS.items():
            if any(keyword in text for keyword in keywords):
                topics.append(topic)
        if topics:
            return topics[:3]
        tokens = re.findall(r"[ぁ-んァ-ン一-龥A-Za-z0-9]{2,}", text)
        return tokens[:3] or ["その他"]

    def _classify_sentiment(self, text: str) -> tuple[str, float]:
        positive = sum(1 for keyword in self.POSITIVE_KEYWORDS if keyword in text)
        negative = sum(1 for keyword in self.NEGATIVE_KEYWORDS if keyword in text)
        if positive > negative:
            return "positive", min(1.0, round(0.35 + positive * 0.2, 2))
        if negative > positive:
            return "negative", max(-1.0, round(-0.35 - negative * 0.2, 2))
        return "neutral", 0.0

    def _classify_type(self, text: str) -> str:
        if any(keyword in text for keyword in self.COMPLAINT_KEYWORDS):
            return "クレーム"
        if any(keyword in text for keyword in self.REQUEST_KEYWORDS):
            return "要望"
        if any(keyword in text for keyword in self.QUESTION_KEYWORDS):
            return "質問"
        if any(keyword in text for keyword in self.PRAISE_KEYWORDS):
            return "お褒め"
        return "その他"
