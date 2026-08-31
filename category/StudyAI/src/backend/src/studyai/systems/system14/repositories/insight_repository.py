from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system14.models.insight import (
    System14AgentAnswer,
    System14Conversation,
    System14DataJob,
    System14InsightGroup,
    System14SalesScore,
    System14Utterance,
    System14Workflow,
    System14WorkflowDeliveryLog,
)


class InsightRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_job(self, *, job_id: str, data_type: str, source: str, metadata: dict) -> System14DataJob:
        job = System14DataJob(
            id=job_id,
            data_type=data_type,
            source=source,
            metadata_json=metadata,
            status="queued",
            progress=0,
        )
        self.session.add(job)
        await self.session.flush()
        await self.session.refresh(job)
        return job

    async def get_job(self, job_id: str) -> System14DataJob:
        result = await self.session.execute(
            select(System14DataJob)
            .options(selectinload(System14DataJob.conversations))
            .where(System14DataJob.id == job_id)
        )
        job = result.scalar_one_or_none()
        if job is None:
            raise NotFoundAppError("job_not_found", "The job was not found.")
        return job

    async def update_job(
        self,
        job_id: str,
        *,
        status: str | None = None,
        progress: int | None = None,
        error_message: str | None = None,
        completed_at: datetime | None = None,
    ) -> System14DataJob:
        job = await self.get_job(job_id)
        if status is not None:
            job.status = status
        if progress is not None:
            job.progress = progress
        if error_message is not None:
            job.error_message = error_message
        if completed_at is not None:
            job.completed_at = completed_at
        await self.session.flush()
        await self.session.refresh(job)
        return job

    async def list_recent_jobs(self, *, limit: int = 5) -> list[System14DataJob]:
        result = await self.session.execute(
            select(System14DataJob)
            .order_by(System14DataJob.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create_conversation(
        self,
        *,
        job_id: str,
        data_type: str,
        source: str,
        transcript: str,
        summary: str | None,
        metadata: dict,
        utterances: list[dict],
    ) -> tuple[System14Conversation, list[System14Utterance]]:
        conversation = System14Conversation(
            job_id=job_id,
            data_type=data_type,
            source=source,
            transcript=transcript,
            summary=summary,
            metadata_json=metadata,
            occurred_at=self._parse_datetime(metadata.get("occurred_at") or metadata.get("date")),
        )
        self.session.add(conversation)
        await self.session.flush()

        rows: list[System14Utterance] = []
        for item in utterances:
            row = System14Utterance(
                conversation_id=conversation.id,
                speaker=item.get("speaker"),
                text=item["text"],
                sentiment=item.get("sentiment", "neutral"),
                sentiment_score=item.get("sentiment_score", 0.0),
                utterance_type=item.get("utterance_type", "その他"),
                topics=item.get("topics", []),
                urgency=item.get("urgency", "low"),
                embedding=item.get("embedding"),
                start_sec=item.get("start_sec"),
                end_sec=item.get("end_sec"),
            )
            self.session.add(row)
            rows.append(row)
        await self.session.flush()
        await self.session.refresh(conversation)
        return conversation, rows

    async def create_sales_score(self, *, conversation_id: int, score: dict) -> System14SalesScore:
        row = System14SalesScore(
            conversation_id=conversation_id,
            staff_id=score.get("staff_id"),
            staff_name=score.get("staff_name"),
            overall_score=score.get("overall_score", 0),
            issue_exploration=score.get("issue_exploration", 0),
            proposal_quality=score.get("proposal_quality", 0),
            next_step_clarity=score.get("next_step_clarity", 0),
            listening_ratio=score.get("listening_ratio", 0.0),
            top_questions=score.get("top_questions", []),
        )
        self.session.add(row)
        await self.session.flush()
        return row

    async def create_insight_groups(self, groups: list[dict]) -> list[System14InsightGroup]:
        rows: list[System14InsightGroup] = []
        for group in groups:
            row = System14InsightGroup(
                label=group["label"],
                sentiment=group.get("sentiment"),
                utterance_type=group.get("utterance_type"),
                count=group.get("count", 0),
                products=group.get("products", []),
                representative_text=group.get("representative_text"),
                period_from=group.get("period_from"),
                period_to=group.get("period_to"),
                utterance_ids=group.get("utterance_ids", []),
            )
            self.session.add(row)
            rows.append(row)
        await self.session.flush()
        return rows

    async def list_utterances(
        self,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        product: str | None = None,
        call_reason: str | None = None,
        sentiment: str | None = None,
        utterance_type: str | None = None,
    ) -> list[tuple[System14Utterance, System14Conversation]]:
        stmt = select(System14Utterance, System14Conversation).join(
            System14Conversation,
            System14Utterance.conversation_id == System14Conversation.id,
        )
        if sentiment:
            stmt = stmt.where(System14Utterance.sentiment == sentiment)
        if utterance_type:
            stmt = stmt.where(System14Utterance.utterance_type == utterance_type)
        if from_date:
            stmt = stmt.where(System14Conversation.created_at >= datetime.combine(from_date, time.min))
        if to_date:
            stmt = stmt.where(System14Conversation.created_at < datetime.combine(to_date + timedelta(days=1), time.min))
        rows = list((await self.session.execute(stmt.order_by(System14Utterance.created_at.desc()))).all())
        if product:
            rows = [row for row in rows if self._metadata_matches(row[1].metadata_json, "product", product)]
        if call_reason:
            rows = [row for row in rows if self._metadata_matches(row[1].metadata_json, "call_reason", call_reason)]
        return rows

    async def list_sales_scores(
        self,
        *,
        from_date: date | None = None,
        to_date: date | None = None,
        staff_id: str | None = None,
    ) -> list[System14SalesScore]:
        stmt = select(System14SalesScore).join(
            System14Conversation,
            System14SalesScore.conversation_id == System14Conversation.id,
        )
        if staff_id:
            stmt = stmt.where(System14SalesScore.staff_id == staff_id)
        if from_date:
            stmt = stmt.where(System14Conversation.created_at >= datetime.combine(from_date, time.min))
        if to_date:
            stmt = stmt.where(System14Conversation.created_at < datetime.combine(to_date + timedelta(days=1), time.min))
        result = await self.session.execute(stmt.order_by(System14SalesScore.created_at.desc()))
        return list(result.scalars().all())

    async def create_workflow(self, *, body) -> System14Workflow:
        workflow = System14Workflow(
            name=body.name,
            trigger=body.trigger,
            data_sources=body.data_sources,
            analysis_steps=body.analysis_steps,
            output_type=body.output_type,
            filters=body.filters,
            delivery=body.delivery.model_dump(),
            is_active=True,
        )
        self.session.add(workflow)
        await self.session.flush()
        await self.session.refresh(workflow)
        return workflow

    async def create_workflow_delivery_log(
        self,
        *,
        workflow_id: int,
        method: str,
        destination: str | None,
        status: str,
        payload: dict,
        response: dict,
        error_message: str | None,
        delivered_at: datetime | None,
    ) -> System14WorkflowDeliveryLog:
        row = System14WorkflowDeliveryLog(
            workflow_id=workflow_id,
            method=method,
            destination=destination,
            status=status,
            payload=payload,
            response_json=response,
            error_message=error_message,
            delivered_at=delivered_at,
        )
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def create_agent_answer(
        self,
        *,
        session_id: str | None,
        question: str,
        answer: str,
        filters: dict,
        recommended_actions: list[str],
        evidence: dict,
        related_links: list[dict],
    ) -> System14AgentAnswer:
        row = System14AgentAnswer(
            session_id=session_id,
            question=question,
            answer=answer,
            filters=filters,
            recommended_actions=recommended_actions,
            evidence=evidence,
            related_links=related_links,
        )
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return row

    async def count_conversations(self) -> int:
        return (await self.session.execute(select(func.count()).select_from(System14Conversation))).scalar_one()

    @staticmethod
    def _metadata_matches(metadata: dict, key: str, expected: str) -> bool:
        candidates = [key, f"{key}_name"]
        return any(expected.lower() in str(metadata.get(candidate, "")).lower() for candidate in candidates)

    @staticmethod
    def _parse_datetime(value) -> datetime | None:
        if value in (None, ""):
            return None
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, time.min)
        try:
            return datetime.fromisoformat(str(value))
        except ValueError:
            return None
