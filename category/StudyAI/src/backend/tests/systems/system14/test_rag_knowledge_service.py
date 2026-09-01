from __future__ import annotations

from types import SimpleNamespace

import pytest

from studyai.common.errors.models import ExternalServiceError
from studyai.systems.system14.services import rag_knowledge_service as rag_module
from studyai.systems.system14.services.insight_query_service import InsightQueryService
from studyai.systems.system14.services.rag_knowledge_service import RagKnowledgeService


class _FakeEmbeddingClient:
    def __init__(self, *, dimensions: int = 768) -> None:
        self.dimensions = dimensions
        self.requests: list[list[str]] = []

    async def embed(self, texts: list[str]) -> list[list[float]]:
        self.requests.append(list(texts))
        return [[0.25] * self.dimensions]


class _FakeLLMClient:
    def __init__(self) -> None:
        self.requests: list[tuple[str, str]] = []

    async def extract_json(self, system_prompt: str, user_prompt: str) -> dict:
        self.requests.append((system_prompt, user_prompt))
        return {
            "answer": "FAQと完了済み対応を根拠に配送状況を確認します。",
            "recommended_actions": ["配送状況を確認する"],
        }


class _FakeRepository:
    instances: list["_FakeRepository"] = []

    def __init__(self, _session) -> None:
        self.upserts: list[dict] = []
        self.__class__.instances.append(self)

    async def search_knowledge_entries(self, *, embedding, product, limit) -> list[dict]:
        assert len(embedding) == 768
        assert product == "商品A"
        assert limit == 5
        return [
            {
                "id": 7,
                "source_type": "faq",
                "source_key": "faq:test",
                "title": "配送遅延時の対応",
                "content": "配送状況を確認します。",
                "product": "商品A",
                "similarity": 0.91,
            }
        ]

    async def list_utterances_for_knowledge(self):
        return [
            SimpleNamespace(
                id=1,
                conversation_id=2,
                conversation=SimpleNamespace(metadata_json={"product": "商品A"}),
                speaker="customer",
                text="配送が遅れています。",
                sentiment="negative",
                utterance_type="クレーム",
                topics=["配送"],
            )
        ]

    async def list_completed_crm_for_knowledge(self):
        return [
            SimpleNamespace(
                id=3,
                external_id="crm-3",
                source_payload={"filters": {"product": "商品A"}},
                summary="配送状況を確認して解決しました。",
                next_action="顧客へ完了連絡する",
                customer_id="customer-1",
                contact_type="voice_ranking",
                sentiment="neutral",
                urgency="normal",
                status="completed",
            )
        ]

    async def list_sales_scores_for_knowledge(self):
        return [
            SimpleNamespace(
                id=4,
                conversation_id=2,
                conversation=SimpleNamespace(metadata_json={"product": "商品A"}),
                staff_id="staff-1",
                staff_name="担当者A",
                overall_score=82,
                issue_exploration=80,
                proposal_quality=84,
                next_step_clarity=81,
                listening_ratio=0.72,
                top_questions=[{"question_type": "確認", "count": 2}],
            )
        ]

    async def list_recent_agent_answers(self, *, session_id, limit):
        assert session_id == "session-1"
        assert limit == 5
        return [SimpleNamespace(question="前の質問", answer="前の回答")]

    async def get_knowledge_entry_by_key(self, _source_key):
        return None

    async def upsert_knowledge_entry(self, **values):
        self.upserts.append(values)
        return SimpleNamespace(**values), True


class _FakeSession:
    def __init__(self) -> None:
        self.commit_count = 0

    async def commit(self) -> None:
        self.commit_count += 1


@pytest.mark.asyncio
async def test_rag_answer_uses_one_embedding_request_and_evidence(monkeypatch) -> None:
    _FakeRepository.instances.clear()
    monkeypatch.setattr(rag_module, "InsightRepository", _FakeRepository)
    embedding = _FakeEmbeddingClient()
    llm = _FakeLLMClient()
    service = RagKnowledgeService(embedding_client=embedding, llm_client=llm)

    result = await service.answer_with_rag(
        _FakeSession(),
        question="配送遅延の対応は？",
        product="商品A",
        limit=5,
        session_id="session-1",
    )

    assert embedding.requests == [["配送遅延の対応は？"]]
    assert len(llm.requests) == 1
    assert result["sources"][0]["source_key"] == "faq:test"
    assert result["recommended_actions"] == ["配送状況を確認する"]


@pytest.mark.asyncio
async def test_index_updates_sources_one_at_a_time(monkeypatch) -> None:
    _FakeRepository.instances.clear()
    monkeypatch.setattr(rag_module, "InsightRepository", _FakeRepository)
    embedding = _FakeEmbeddingClient()
    service = RagKnowledgeService(embedding_client=embedding, llm_client=_FakeLLMClient())
    session = _FakeSession()

    result = await service.update_index(session)

    assert len(embedding.requests) == 3
    assert all(len(request) == 1 for request in embedding.requests)
    assert "配送が遅れています。" in embedding.requests[0][0]
    assert "総合スコア: 82" in embedding.requests[1][0]
    assert "配送状況を確認して解決しました。" in embedding.requests[2][0]
    assert result.utterances_indexed == 1
    assert result.sales_scores_indexed == 1
    assert result.crm_histories_indexed == 1
    assert session.commit_count == 1


@pytest.mark.asyncio
async def test_embedding_dimension_mismatch_is_not_silently_replaced() -> None:
    service = RagKnowledgeService(
        embedding_client=_FakeEmbeddingClient(dimensions=3),
        llm_client=_FakeLLMClient(),
    )

    with pytest.raises(ExternalServiceError) as exc_info:
        await service._embed_one("質問")

    assert exc_info.value.error_code == "invalid_embedding_output"


def test_saved_faq_covers_matching_topic_for_same_product() -> None:
    assert InsightQueryService._faq_covers_topic(
        topic="配送 遅延",
        product="商品A",
        faq_title="配送遅延時の確認方法",
        faq_content="配送状況を確認します。",
        faq_product="商品A",
    )
    assert not InsightQueryService._faq_covers_topic(
        topic="配送 遅延",
        product="商品B",
        faq_title="配送遅延時の確認方法",
        faq_content="配送状況を確認します。",
        faq_product="商品A",
    )
