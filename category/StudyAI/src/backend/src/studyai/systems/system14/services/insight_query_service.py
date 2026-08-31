from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system14.repositories.insight_repository import InsightRepository
from studyai.systems.system14.schemas.insight import (
    ActionProposalItem,
    ActionProposalResponse,
    DashboardCard,
    DashboardResponse,
    FAQGapItem,
    FAQGapResponse,
    JobStatusResponse,
    SalesScoreBreakdown,
    SalesScoreItem,
    SalesScoreResponse,
    SuggestedFAQ,
    TopQuestionItem,
    VoiceRankingItem,
    VoiceRankingResponse,
    WinLossItem,
    WinLossResponse,
)


class InsightQueryService:
    async def get_voice_ranking(
        self,
        session: AsyncSession,
        *,
        from_date: date | None,
        to_date: date | None,
        product: str | None,
        call_reason: str | None,
        sentiment: str | None,
        utterance_type: str | None,
        limit: int,
    ) -> VoiceRankingResponse:
        repo = InsightRepository(session)
        rows = await repo.list_utterances(
            from_date=from_date,
            to_date=to_date,
            product=product,
            call_reason=call_reason,
            sentiment=sentiment,
            utterance_type=utterance_type,
        )
        buckets: dict[tuple[str, str, str], list[tuple]] = defaultdict(list)
        for utterance, conversation in rows:
            topic = str((utterance.topics or ["その他"])[0])
            buckets[(topic, utterance.sentiment, utterance.utterance_type)].append((utterance, conversation))

        ranking: list[VoiceRankingItem] = []
        sorted_items = sorted(buckets.items(), key=lambda item: len(item[1]), reverse=True)[:limit]
        for index, ((topic, item_sentiment, item_type), items) in enumerate(sorted_items, start=1):
            products = sorted(
                {
                    str(conversation.metadata_json.get("product") or conversation.metadata_json.get("product_name"))
                    for _, conversation in items
                    if conversation.metadata_json.get("product") or conversation.metadata_json.get("product_name")
                }
            )
            ranking.append(
                VoiceRankingItem(
                    rank=index,
                    group_label=f"{topic}に関する{item_type}" if topic != "その他" else item_type,
                    count=len(items),
                    sentiment=item_sentiment,
                    type=item_type,
                    products=products,
                    representative_text=items[0][0].text,
                    source_ids=[str(item[0].conversation_id) for item in items[:10]],
                )
            )
        return VoiceRankingResponse(
            period=self._period_label(from_date, to_date),
            total_data_count=len(rows),
            ranking=ranking,
        )

    async def get_sales_score(
        self,
        session: AsyncSession,
        *,
        from_date: date | None,
        to_date: date | None,
        staff_id: str | None,
    ) -> SalesScoreResponse:
        rows = await InsightRepository(session).list_sales_scores(
            from_date=from_date,
            to_date=to_date,
            staff_id=staff_id,
        )
        grouped: dict[str, list] = defaultdict(list)
        for row in rows:
            grouped[row.staff_id or "unknown"].append(row)

        scores: list[SalesScoreItem] = []
        for key, items in grouped.items():
            count = len(items)
            scores.append(
                SalesScoreItem(
                    staff_id=None if key == "unknown" else key,
                    staff_name=items[0].staff_name,
                    overall_score=round(sum(item.overall_score for item in items) / count),
                    breakdown=SalesScoreBreakdown(
                        issue_exploration=round(sum(item.issue_exploration for item in items) / count),
                        proposal_quality=round(sum(item.proposal_quality for item in items) / count),
                        next_step_clarity=round(sum(item.next_step_clarity for item in items) / count),
                        listening_ratio=round(sum(float(item.listening_ratio) for item in items) / count, 2),
                    ),
                    top_questions=[
                        TopQuestionItem(**question)
                        for question in self._merge_top_questions([item.top_questions for item in items])
                    ],
                )
            )
        scores.sort(key=lambda item: item.overall_score, reverse=True)
        return SalesScoreResponse(period=self._period_label(from_date, to_date), scores=scores)

    async def get_win_loss(
        self,
        session: AsyncSession,
        *,
        from_date: date | None,
        to_date: date | None,
        limit: int,
    ) -> WinLossResponse:
        rows = await InsightRepository(session).list_utterances(from_date=from_date, to_date=to_date)
        reasons: Counter[tuple[str, str, str]] = Counter()
        examples: dict[tuple[str, str, str], str] = {}
        for utterance, conversation in rows:
            outcome = str(conversation.metadata_json.get("outcome") or "unknown")
            if outcome not in {"win", "loss", "受注", "失注"}:
                continue
            category = self._reason_category(utterance.topics)
            reason = str((utterance.topics or [utterance.utterance_type])[0])
            key = (reason, outcome, category)
            reasons[key] += 1
            examples.setdefault(key, utterance.text)
        items = [
            WinLossItem(
                rank=index,
                reason=reason,
                result_type=outcome,
                category=category,
                count=count,
                representative_text=examples[(reason, outcome, category)],
            )
            for index, ((reason, outcome, category), count) in enumerate(reasons.most_common(limit), start=1)
        ]
        return WinLossResponse(period=self._period_label(from_date, to_date), win_loss=items)

    async def get_dashboard(self, session: AsyncSession) -> DashboardResponse:
        repo = InsightRepository(session)
        rows = await repo.list_utterances()
        recent_jobs = await repo.list_recent_jobs(limit=5)
        total_conversations = await repo.count_conversations()
        sentiment_summary = Counter(utterance.sentiment for utterance, _ in rows)
        voice_ranking = await self.get_voice_ranking(
            session,
            from_date=None,
            to_date=None,
            product=None,
            call_reason=None,
            sentiment=None,
            utterance_type=None,
            limit=5,
        )
        high_urgency = sum(1 for utterance, _ in rows if utterance.urgency == "high")
        avg_score = 0.0
        scores = await repo.list_sales_scores()
        if scores:
            avg_score = round(sum(item.overall_score for item in scores) / len(scores), 1)
        return DashboardResponse(
            cards=[
                DashboardCard(key="conversations", label="会話数", value=total_conversations, unit="件"),
                DashboardCard(key="utterances", label="発話数", value=len(rows), unit="件"),
                DashboardCard(key="high_urgency", label="緊急アラート", value=high_urgency, unit="件"),
                DashboardCard(key="avg_sales_score", label="平均営業スコア", value=avg_score, unit="点"),
            ],
            sentiment_summary=dict(sentiment_summary),
            top_topics=voice_ranking.ranking,
            recent_jobs=[
                JobStatusResponse(
                    job_id=job.id,
                    status=job.status,
                    progress=job.progress,
                    data_type=job.data_type,
                    source=job.source,
                    error_message=job.error_message,
                    created_at=job.created_at,
                    completed_at=job.completed_at,
                )
                for job in recent_jobs
            ],
        )

    async def get_action_proposals(
        self,
        session: AsyncSession,
        *,
        product: str | None,
        priority: str | None,
        from_date: date | None,
        to_date: date | None,
    ) -> ActionProposalResponse:
        ranking = await self.get_voice_ranking(
            session,
            from_date=from_date,
            to_date=to_date,
            product=product,
            call_reason=None,
            sentiment="negative",
            utterance_type=None,
            limit=10,
        )
        proposals: list[ActionProposalItem] = []
        for item in ranking.ranking:
            resolved_priority = "高" if item.count >= 10 else "中" if item.count >= 3 else "低"
            if priority and priority not in {resolved_priority, resolved_priority.lower()}:
                continue
            proposals.append(
                ActionProposalItem(
                    priority=resolved_priority,
                    issue=item.group_label,
                    evidence_count=item.count,
                    recommended_action=f"{item.group_label}の代表発言を確認し、FAQ・トークスクリプト・製品改善のいずれで対応するか決定する。",
                    target_department=self._target_department(item.type or ""),
                )
            )
        return ActionProposalResponse(product=product, proposals=proposals)

    async def get_faq_gaps(
        self,
        session: AsyncSession,
        *,
        product: str | None,
        limit: int,
    ) -> FAQGapResponse:
        ranking = await self.get_voice_ranking(
            session,
            from_date=None,
            to_date=None,
            product=product,
            call_reason=None,
            sentiment=None,
            utterance_type="質問",
            limit=limit,
        )
        gaps = [
            FAQGapItem(
                rank=item.rank,
                call_reason=item.group_label,
                inquiry_count=item.count,
                existing_faq=None,
                suggested_faq=SuggestedFAQ(
                    question=f"{item.group_label}についてどう確認すればよいですか？",
                    answer=f"{item.representative_text or item.group_label} という問い合わせが多いため、確認手順・条件・次の連絡先をFAQに追加してください。",
                ),
            )
            for item in ranking.ranking
        ]
        return FAQGapResponse(product=product, faq_gaps=gaps)

    @staticmethod
    def _period_label(from_date: date | None, to_date: date | None) -> str:
        if from_date and to_date:
            return f"{from_date.isoformat()}〜{to_date.isoformat()}"
        if from_date:
            return f"{from_date.isoformat()}〜"
        if to_date:
            return f"〜{to_date.isoformat()}"
        return "all"

    @staticmethod
    def _merge_top_questions(question_lists: list[list[dict]]) -> list[dict]:
        counter: Counter[str] = Counter()
        examples: dict[str, str | None] = {}
        for questions in question_lists:
            for question in questions:
                question_type = str(question.get("question_type") or "確認質問")
                counter[question_type] += int(question.get("count") or 0)
                examples.setdefault(question_type, question.get("example"))
        return [
            {"question_type": question_type, "count": count, "example": examples.get(question_type)}
            for question_type, count in counter.most_common(3)
        ]

    @staticmethod
    def _reason_category(topics: list | None) -> str:
        topic = str((topics or ["その他"])[0])
        if topic in {"価格", "契約"}:
            return "営業要因"
        if topic in {"品質", "操作性"}:
            return "製品要因"
        return "その他"

    @staticmethod
    def _target_department(item_type: str) -> str:
        if item_type == "クレーム":
            return "コンタクトセンター"
        if item_type == "要望":
            return "製品開発"
        return "マーケティング"
