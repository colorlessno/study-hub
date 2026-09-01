from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system14.repositories.insight_repository import InsightRepository
from studyai.systems.system14.schemas.insight import AgentChatRequest, AgentChatResponse, RelatedLink
from studyai.systems.system14.services.insight_query_service import InsightQueryService
from studyai.systems.system14.services.rag_knowledge_service import RagKnowledgeService


class AgentChatService:
    def __init__(self, *, rag_service: RagKnowledgeService | None = None) -> None:
        self.query_service = InsightQueryService()
        self.rag_service = rag_service or RagKnowledgeService()

    async def answer_agent_query(
        self,
        session: AsyncSession,
        *,
        body: AgentChatRequest,
    ) -> AgentChatResponse:
        filters = body.filters
        product = filters.get("product")
        call_reason = filters.get("call_reason")
        staff_id = filters.get("staff_id")

        if body.use_rag:
            rag_result = await self.rag_service.answer_with_rag(
                session,
                question=body.question,
                product=str(product).strip() if product else None,
                limit=body.rag_limit,
                session_id=body.session_id,
            )
            related_links = [
                {"label": "RAG・FAQ管理", "endpoint": "/knowledge/faqs"},
                {"label": "顧客対応履歴", "endpoint": "/dummy-crm/activities"},
            ]
            evidence = {"rag_sources": rag_result["sources"]}
            saved = await InsightRepository(session).create_agent_answer(
                session_id=body.session_id,
                question=body.question,
                answer=rag_result["answer"],
                filters={**filters, "use_rag": True, "rag_limit": body.rag_limit},
                recommended_actions=rag_result["recommended_actions"],
                evidence=evidence,
                related_links=related_links,
            )
            await session.commit()
            return AgentChatResponse(
                answer_id=saved.id,
                question=body.question,
                answer=saved.answer,
                recommended_actions=rag_result["recommended_actions"],
                evidence=evidence,
                related_links=[RelatedLink(**item) for item in related_links],
            )

        ranking = await self.query_service.get_voice_ranking(
            session,
            from_date=None,
            to_date=None,
            product=product,
            call_reason=call_reason,
            sentiment=None,
            utterance_type=None,
            limit=3,
        )
        sales = await self.query_service.get_sales_score(
            session,
            from_date=None,
            to_date=None,
            staff_id=staff_id,
        )

        top_topic = ranking.ranking[0] if ranking.ranking else None
        top_score = sales.scores[0] if sales.scores else None
        answer_parts: list[str] = []
        if top_topic:
            answer_parts.append(
                f"顧客の声では「{top_topic.group_label}」が最も多く、{top_topic.count}件あります。"
            )
        else:
            answer_parts.append("条件に一致する顧客の声はまだ登録されていません。")
        if top_score:
            answer_parts.append(
                f"営業スコアは {top_score.staff_id or '全体'} が {top_score.overall_score} 点で、傾聴比率は {top_score.breakdown.listening_ratio:.2f} です。"
            )
        answer_parts.append("次のアクションとして、件数の多いトピックから代表発言を確認し、FAQ・トークスクリプト・製品改善へ振り分けてください。")

        recommended_actions = [
            "上位トピックの代表発言を確認する",
            "ネガティブ件数が多い項目をFAQまたはトークスクリプトへ反映する",
            "営業スコアが低い担当者にはトップスコア担当者の質問例を共有する",
        ]
        evidence = {
            "total_utterances": ranking.total_data_count,
            "top_group": top_topic.model_dump() if top_topic else None,
            "top_sales_score": top_score.model_dump() if top_score else None,
        }
        related_links = [
            {"label": "顧客の声ランキング", "endpoint": "/insights/voice-ranking"},
            {"label": "営業スコア", "endpoint": "/insights/sales-score"},
        ]
        saved = await InsightRepository(session).create_agent_answer(
            session_id=body.session_id,
            question=body.question,
            answer=" ".join(answer_parts),
            filters=filters,
            recommended_actions=recommended_actions,
            evidence=evidence,
            related_links=related_links,
        )
        await session.commit()
        return AgentChatResponse(
            answer_id=saved.id,
            question=body.question,
            answer=saved.answer,
            recommended_actions=recommended_actions,
            evidence=evidence,
            related_links=[RelatedLink(**item) for item in related_links],
        )
