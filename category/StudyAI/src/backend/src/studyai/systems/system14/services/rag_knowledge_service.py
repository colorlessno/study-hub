from __future__ import annotations

import json
from typing import Any
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.ai.llm_client import LLMClient
from studyai.common.errors.models import AppError, ExternalServiceError
from studyai.systems.system14.models.insight import EMBEDDING_DIMENSIONS, System14KnowledgeEntry
from studyai.systems.system14.repositories.insight_repository import InsightRepository
from studyai.systems.system14.schemas.insight import (
    KnowledgeEntryListResponse,
    KnowledgeEntryResponse,
    KnowledgeFaqCreateRequest,
    KnowledgeIndexResponse,
)

RAG_ANSWER_SYSTEM_PROMPT = """あなたは顧客対応分析の支援者です。
渡された検索根拠だけを使い、日本語で回答してください。
根拠にない事実を補わず、不明な点は不明と明記してください。
回答には参照した根拠件数と、判断に使った類似度・スコアなどの数値を含めてください。
次のJSON objectだけを返してください。
{
  "answer": "根拠に基づく回答",
  "recommended_actions": ["実行可能な次の行動"]
}
recommended_actionsは0件以上3件以下にしてください。
"""


class RagKnowledgeService:
    def __init__(
        self,
        *,
        embedding_client: EmbeddingClient | None = None,
        llm_client: LLMClient | None = None,
    ) -> None:
        self.embedding_client = embedding_client or EmbeddingClient()
        self.llm_client = llm_client or LLMClient()

    async def create_faq(
        self,
        session: AsyncSession,
        *,
        body: KnowledgeFaqCreateRequest,
    ) -> KnowledgeEntryResponse:
        question = body.question.strip()
        answer = body.answer.strip()
        product = body.product.strip() if body.product and body.product.strip() else None
        embedding = await self._embed_one(self._document_text(question, answer))
        row, _ = await InsightRepository(session).upsert_knowledge_entry(
            source_type="faq",
            source_key=f"faq:{uuid4().hex}",
            title=question,
            content=answer,
            product=product,
            metadata={"question": question},
            embedding=embedding,
        )
        await session.commit()
        return KnowledgeEntryResponse.model_validate(row)

    async def list_faqs(
        self,
        session: AsyncSession,
        *,
        limit: int,
    ) -> KnowledgeEntryListResponse:
        rows = await InsightRepository(session).list_knowledge_entries(
            source_type="faq",
            limit=limit,
        )
        return KnowledgeEntryListResponse(
            entries=[KnowledgeEntryResponse.model_validate(row) for row in rows]
        )

    async def update_index(self, session: AsyncSession) -> KnowledgeIndexResponse:
        repository = InsightRepository(session)
        utterances_indexed = 0
        sales_scores_indexed = 0
        crm_histories_indexed = 0
        unchanged_skipped = 0

        utterances = await repository.list_utterances_for_knowledge()
        for utterance in utterances:
            metadata = dict(utterance.conversation.metadata_json or {})
            product = self._optional_text(metadata.get("product") or metadata.get("product_name"))
            indexed = await self._index_entry(
                repository,
                source_type="utterance",
                source_key=f"utterance:{utterance.id}",
                title=f"発話 {utterance.id}",
                content=utterance.text,
                product=product,
                metadata={
                    "utterance_id": utterance.id,
                    "conversation_id": utterance.conversation_id,
                    "speaker": utterance.speaker,
                    "sentiment": utterance.sentiment,
                    "utterance_type": utterance.utterance_type,
                    "topics": utterance.topics,
                },
            )
            if indexed:
                utterances_indexed += 1
            else:
                unchanged_skipped += 1

        sales_scores = await repository.list_sales_scores_for_knowledge()
        for score in sales_scores:
            metadata = dict(score.conversation.metadata_json or {})
            product = self._optional_text(metadata.get("product") or metadata.get("product_name"))
            content = (
                f"総合スコア: {score.overall_score}\n"
                f"課題深掘り: {score.issue_exploration}\n"
                f"提案品質: {score.proposal_quality}\n"
                f"次の行動の明確さ: {score.next_step_clarity}\n"
                f"傾聴比率: {float(score.listening_ratio):.2f}\n"
                f"主な質問: {json.dumps(score.top_questions, ensure_ascii=False)}"
            )
            indexed = await self._index_entry(
                repository,
                source_type="sales_score",
                source_key=f"sales-score:{score.id}",
                title=f"営業スコア {score.staff_name or score.staff_id or score.id}",
                content=content,
                product=product,
                metadata={
                    "sales_score_id": score.id,
                    "conversation_id": score.conversation_id,
                    "staff_id": score.staff_id,
                    "staff_name": score.staff_name,
                    "overall_score": score.overall_score,
                },
            )
            if indexed:
                sales_scores_indexed += 1
            else:
                unchanged_skipped += 1

        activities = await repository.list_completed_crm_for_knowledge()
        for activity in activities:
            payload = dict(activity.source_payload or {})
            filters = payload.get("filters") if isinstance(payload.get("filters"), dict) else {}
            product = self._optional_text(payload.get("product") or filters.get("product"))
            content = activity.summary
            if activity.next_action:
                content += f"\n次の対応: {activity.next_action}"
            indexed = await self._index_entry(
                repository,
                source_type="crm_history",
                source_key=f"crm:{activity.id}",
                title=f"完了済み対応 {activity.external_id}",
                content=content,
                product=product,
                metadata={
                    "activity_id": activity.id,
                    "customer_id": activity.customer_id,
                    "contact_type": activity.contact_type,
                    "sentiment": activity.sentiment,
                    "urgency": activity.urgency,
                    "status": activity.status,
                },
            )
            if indexed:
                crm_histories_indexed += 1
            else:
                unchanged_skipped += 1

        await session.commit()
        return KnowledgeIndexResponse(
            utterances_indexed=utterances_indexed,
            sales_scores_indexed=sales_scores_indexed,
            crm_histories_indexed=crm_histories_indexed,
            unchanged_skipped=unchanged_skipped,
        )

    async def answer_with_rag(
        self,
        session: AsyncSession,
        *,
        question: str,
        product: str | None,
        limit: int,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        query_embedding = await self._embed_one(question.strip())
        sources = await InsightRepository(session).search_knowledge_entries(
            embedding=query_embedding,
            product=product,
            limit=limit,
        )
        if not sources:
            raise AppError(
                "rag_knowledge_empty",
                "RAGの検索対象がありません。FAQを登録するか、索引を更新してください。",
                409,
            )
        conversation_history: list[dict[str, str]] = []
        if session_id:
            previous_answers = await InsightRepository(session).list_recent_agent_answers(
                session_id=session_id,
                limit=5,
            )
            conversation_history = [
                {"question": item.question, "answer": item.answer}
                for item in previous_answers
            ]
        prompt = json.dumps(
            {
                "question": question.strip(),
                "product": product,
                "conversation_history": conversation_history,
                "sources": [
                    {
                        "source_type": source["source_type"],
                        "title": source["title"],
                        "content": source["content"][:4000],
                        "similarity": round(float(source["similarity"]), 4),
                    }
                    for source in sources
                ],
            },
            ensure_ascii=False,
        )
        generated = await self.llm_client.extract_json(RAG_ANSWER_SYSTEM_PROMPT, prompt)
        answer = generated.get("answer") if isinstance(generated, dict) else None
        actions = generated.get("recommended_actions") if isinstance(generated, dict) else None
        if not isinstance(answer, str) or not answer.strip():
            raise ExternalServiceError("invalid_model_output", "RAG回答にanswerがありません。", 422)
        if not isinstance(actions, list) or len(actions) > 3 or any(not isinstance(item, str) for item in actions):
            raise ExternalServiceError(
                "invalid_model_output",
                "RAG回答のrecommended_actionsは3件以下の文字列配列にしてください。",
                422,
            )
        return {
            "answer": answer.strip(),
            "recommended_actions": [item.strip() for item in actions if item.strip()],
            "sources": [
                {
                    "id": source["id"],
                    "source_type": source["source_type"],
                    "source_key": source["source_key"],
                    "title": source["title"],
                    "product": source["product"],
                    "similarity": round(float(source["similarity"]), 4),
                }
                for source in sources
            ],
        }

    async def _index_entry(
        self,
        repository: InsightRepository,
        *,
        source_type: str,
        source_key: str,
        title: str,
        content: str,
        product: str | None,
        metadata: dict,
    ) -> bool:
        existing = await repository.get_knowledge_entry_by_key(source_key)
        if self._is_unchanged(existing, title=title, content=content, product=product, metadata=metadata):
            return False
        embedding = await self._embed_one(self._document_text(title, content))
        await repository.upsert_knowledge_entry(
            source_type=source_type,
            source_key=source_key,
            title=title,
            content=content,
            product=product,
            metadata=metadata,
            embedding=embedding,
        )
        return True

    async def _embed_one(self, text: str) -> list[float]:
        embeddings = await self.embedding_client.embed([text])
        if len(embeddings) != 1 or len(embeddings[0]) != EMBEDDING_DIMENSIONS:
            raise ExternalServiceError(
                "invalid_embedding_output",
                f"Embeddingは{EMBEDDING_DIMENSIONS}次元を1件返す必要があります。",
                422,
            )
        return [float(value) for value in embeddings[0]]

    @staticmethod
    def _is_unchanged(
        existing: System14KnowledgeEntry | None,
        *,
        title: str,
        content: str,
        product: str | None,
        metadata: dict,
    ) -> bool:
        return bool(
            existing
            and existing.embedding is not None
            and existing.title == title
            and existing.content == content
            and existing.product == product
            and existing.metadata_json == metadata
            and existing.is_active
        )

    @staticmethod
    def _document_text(title: str, content: str) -> str:
        return f"{title.strip()}\n{content.strip()}"

    @staticmethod
    def _optional_text(value: object) -> str | None:
        normalized = str(value).strip() if value is not None else ""
        return normalized or None
