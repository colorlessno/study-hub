from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.ai.llm_client import LLMClient
from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system03.models.document import System03Document, System03DocumentChunk
from studyai.systems.system03.prompts.ask_prompt import build_ask_prompts
from studyai.systems.system03.repositories.document_repository import DocumentRepository
from studyai.systems.system03.repositories.question_log_repository import QuestionLogRepository
from studyai.systems.system03.repositories.session_repository import SessionRepository
from studyai.systems.system03.schemas.qa import AskRequest, AskResponse, AskSource, FeedbackRequest, FeedbackResponse
from studyai.systems.system03.services.retrieval_scoring import score_candidate


class AskService:
    def __init__(self) -> None:
        self.embedding_client = EmbeddingClient()
        self.llm_client = LLMClient()

    async def ask(self, session: AsyncSession, request: AskRequest) -> AskResponse:
        session_repo = SessionRepository(session)
        document_repo = DocumentRepository(session)
        log_repo = QuestionLogRepository(session)

        conversation = await session_repo.get_or_create(request.session_id, request.project_id, request.user_id)
        candidates = await document_repo.list_active_chunks(
            project_id=request.project_id,
            category_filter=request.category_filter,
        )
        if not candidates:
            unanswered = await log_repo.create_log(
                session_id=request.session_id,
                project_id=request.project_id,
                question=request.question,
                answer=None,
                sources=[],
                confidence=None,
                answer_status="unanswered",
            )
            await session.commit()
            raise NotFoundAppError(
                "no_relevant_document",
                "関連する文書が見つかりませんでした。",
                {"answer_id": unanswered.id},
            )

        question_embedding = (await self.embedding_client.embed([request.question]))[0]
        ranked = self._rank_candidates(request.question, question_embedding, candidates)
        top_candidates = [item for item in ranked[:3] if item["hybrid_score"] > 0]
        if not top_candidates:
            unanswered = await log_repo.create_log(
                session_id=request.session_id,
                project_id=request.project_id,
                question=request.question,
                answer=None,
                sources=[],
                confidence=None,
                answer_status="unanswered",
            )
            await session.commit()
            raise NotFoundAppError(
                "no_relevant_document",
                "関連する文書が見つかりませんでした。",
                {"answer_id": unanswered.id},
            )

        retrieved_sources = [
            {
                "document_name": item["document"].file_name,
                "section": item["chunk"].section_title,
                "excerpt": str(item["chunk"].chunk_text)[:400],
            }
            for item in top_candidates
        ]

        system_prompt, user_prompt = build_ask_prompts(
            request.question,
            conversation.short_memory[-5:],
            retrieved_sources,
        )
        raw = await self.llm_client.extract_json(system_prompt, user_prompt)

        sources = [
            AskSource(
                document_name=str(source["document_name"]),
                section=source.get("section"),
                excerpt=str(source["excerpt"]),
            )
            for source in raw.get("sources", retrieved_sources[:3])
        ]
        answer = str(raw.get("answer", "")).strip()
        confidence = str(raw.get("confidence", "中")).strip() or "中"
        related_questions = [str(item).strip() for item in raw.get("related_questions", []) if str(item).strip()][:3]

        saved = await log_repo.create_log(
            session_id=request.session_id,
            project_id=request.project_id,
            question=request.question,
            answer=answer,
            sources=[source.model_dump() for source in sources],
            confidence=confidence,
            answer_status="answered",
        )
        await session_repo.append_history(request.session_id, request.question, answer)
        await session.commit()

        return AskResponse(
            answer_id=saved.id,
            session_id=request.session_id,
            question=request.question,
            answer=answer,
            confidence=confidence,
            sources=sources,
            related_questions=related_questions,
        )

    async def submit_feedback(self, session: AsyncSession, request: FeedbackRequest) -> FeedbackResponse:
        updated = await QuestionLogRepository(session).submit_feedback(
            answer_id=request.answer_id,
            is_helpful=request.is_helpful,
            comment=request.comment,
        )
        await session.commit()
        return FeedbackResponse(
            answer_id=updated.id,
            rating=updated.rating or 0,
            comment=updated.feedback_comment,
        )

    def _rank_candidates(
        self,
        question: str,
        question_embedding: list[float],
        candidates: list[tuple[System03DocumentChunk, System03Document]],
    ) -> list[dict[str, object]]:
        ranked: list[dict[str, object]] = []
        for chunk, document in candidates:
            scores = score_candidate(
                question,
                question_embedding,
                chunk.chunk_text,
                chunk.embedding or [],
            )
            ranked.append(
                {
                    "chunk": chunk,
                    "document": document,
                    **scores,
                }
            )
        ranked.sort(key=lambda item: item["hybrid_score"], reverse=True)
        return ranked
