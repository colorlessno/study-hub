from __future__ import annotations

from studyai.systems.system14.services.grouping_service import GroupingService


def test_grouping_service_groups_by_topic_sentiment_and_type() -> None:
    groups = GroupingService().build_groups(
        [
            {"id": 1, "text": "配送が遅い", "topics": ["配送"], "sentiment": "negative", "utterance_type": "クレーム", "product": "商品A"},
            {"id": 2, "text": "発送が遅い", "topics": ["配送"], "sentiment": "negative", "utterance_type": "クレーム", "product": "商品A"},
            {"id": 3, "text": "価格を下げてほしい", "topics": ["価格"], "sentiment": "negative", "utterance_type": "要望", "product": "商品B"},
        ]
    )

    assert groups[0]["label"] == "配送に関するクレーム"
    assert groups[0]["count"] == 2
    assert groups[0]["products"] == ["商品A"]
    assert groups[0]["utterance_ids"] == [1, 2]
