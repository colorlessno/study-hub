from __future__ import annotations

from types import SimpleNamespace

from studyai.systems.system13.services.knowledge_retriever import KnowledgeRetriever


def test_rank_records_prefers_high_similarity_and_importance() -> None:
    retriever = KnowledgeRetriever()
    candidates = [
        SimpleNamespace(
            title="Low quality note",
            category="general",
            importance="low",
            is_landmine=False,
            content="database migration",
            embedding=[1.0, 0.0],
        ),
        SimpleNamespace(
            title="Critical migration warning",
            category="risks",
            importance="high",
            is_landmine=True,
            content="database migration warning rollback",
            embedding=[0.9, 0.1],
        ),
    ]
    ranked = retriever.rank_records("database migration rollback", [1.0, 0.0], candidates)
    assert ranked[0].knowledge.title == "Critical migration warning"
    assert ranked[0].hybrid_score > ranked[1].hybrid_score
