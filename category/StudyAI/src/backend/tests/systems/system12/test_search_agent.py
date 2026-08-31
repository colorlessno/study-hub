from __future__ import annotations

from types import SimpleNamespace

from studyai.systems.system12.services.ontology_rule_engine import OntologyRuleEngine
from studyai.systems.system12.services.search_agent import SearchAgent


def test_search_agent_scores_matching_product() -> None:
    product = SimpleNamespace(
        name="花ギフト",
        category="フラワー",
        description="母の日向けの花束",
        tags=["花", "母の日"],
        suitable_scenes=["母の日"],
        suitable_recipients=["母"],
        attributes={"style": "花"},
        price=4000,
        purchase_count=5,
        formality=3,
        embedding=None,
    )

    score = SearchAgent()._score_product(
        product,
        {"scene": "母の日", "recipient": "母", "budget": 5000, "preference": "花"},
        "母の日 母 花",
        None,
    )

    assert score > 3.0


def test_ontology_rule_engine_matches_rule_keyword() -> None:
    product = SimpleNamespace(
        name="アルコールギフト",
        category="酒",
        description="ワインセット",
        tags=["酒", "ワイン"],
        attributes={"type": "酒"},
    )

    assert OntologyRuleEngine()._matches_rule(product, "酒") is True
