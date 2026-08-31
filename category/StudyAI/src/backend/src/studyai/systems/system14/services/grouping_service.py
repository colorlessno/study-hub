from __future__ import annotations

from collections import defaultdict
from datetime import date


class GroupingService:
    def build_groups(
        self,
        utterances: list[dict],
        *,
        period_from: date | None = None,
        period_to: date | None = None,
    ) -> list[dict]:
        buckets: dict[tuple[str, str, str], list[dict]] = defaultdict(list)
        for utterance in utterances:
            topics = utterance.get("topics") or ["その他"]
            primary_topic = str(topics[0]) if topics else "その他"
            key = (primary_topic, utterance.get("sentiment") or "neutral", utterance.get("utterance_type") or "その他")
            buckets[key].append(utterance)

        groups: list[dict] = []
        for (topic, sentiment, utterance_type), items in buckets.items():
            products = sorted(
                {
                    str(item.get("product"))
                    for item in items
                    if item.get("product") not in (None, "")
                }
            )
            groups.append(
                {
                    "label": self._label(topic, utterance_type),
                    "sentiment": sentiment,
                    "utterance_type": utterance_type,
                    "count": len(items),
                    "products": products,
                    "representative_text": str(items[0].get("text") or "")[:400],
                    "period_from": period_from,
                    "period_to": period_to,
                    "utterance_ids": [item.get("id") for item in items if item.get("id") is not None],
                }
            )
        groups.sort(key=lambda item: item["count"], reverse=True)
        return groups

    @staticmethod
    def _label(topic: str, utterance_type: str) -> str:
        if topic == "その他":
            return utterance_type
        if utterance_type in {"クレーム", "要望", "質問", "お褒め"}:
            return f"{topic}に関する{utterance_type}"
        return topic
