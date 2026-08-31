from __future__ import annotations

from collections import defaultdict


class TopicExtractor:
    _TOPIC_RULES = {
        "quality": ("quality", "durability", "品質", "耐久", "頑丈"),
        "price": ("price", "cost", "expensive", "cheap", "価格", "コスパ", "高い", "安い"),
        "design": ("design", "look", "style", "デザイン", "見た目"),
        "usability": ("easy", "hard", "使いやす", "使いにく", "操作"),
        "delivery": ("delivery", "shipping", "packaging", "配送", "梱包"),
        "support": ("support", "service", "対応", "サポート"),
        "size_fit": ("size", "fit", "サイズ", "フィット", "装着"),
        "battery": ("battery", "charging", "バッテリー", "充電"),
        "sound": ("sound", "noise", "audio", "音質", "ノイズ"),
    }

    def extract_topics(self, text: str) -> list[str]:
        text_lower = text.lower()
        topics = [topic for topic, keywords in self._TOPIC_RULES.items() if any(keyword in text_lower for keyword in keywords)]
        if not topics:
            return ["general"]
        return topics

    def summarize_topics(self, analyzed_reviews: list[dict]) -> list[dict]:
        buckets: dict[str, dict] = defaultdict(
            lambda: {"topic": "", "positive_count": 0, "negative_count": 0, "representative_text": None}
        )
        for review in analyzed_reviews:
            for topic in review["topics"]:
                bucket = buckets[topic]
                bucket["topic"] = topic
                if review["sentiment"] == "positive":
                    bucket["positive_count"] += 1
                elif review["sentiment"] == "negative":
                    bucket["negative_count"] += 1
                if bucket["representative_text"] is None:
                    bucket["representative_text"] = review["text"]
        return sorted(
            buckets.values(),
            key=lambda item: (item["positive_count"] + item["negative_count"], item["topic"]),
            reverse=True,
        )
