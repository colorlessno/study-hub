from __future__ import annotations

import csv
from io import StringIO
from pathlib import Path
from time import perf_counter

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system16.repositories.match_repository import MatchRepository
from studyai.systems.system16.schemas.matching import (
    BulkMatchItemResponse,
    BulkMatchResponse,
    MatchListItem,
    MatchListResponse,
    MatchReport,
    MatchRequest,
    MatchResponse,
    PastCaseCreateRequest,
    PastCaseCreateResponse,
    ScoreBreakdown,
    SimilarCaseResponse,
    SkillsheetParseResponse,
)
from studyai.systems.system16.services.candidate_profiler import CandidateProfiler
from studyai.systems.system16.services.match_scorer import MatchScorer
from studyai.systems.system16.services.past_case_retriever import PastCaseRetriever
from studyai.systems.system16.services.privacy_guard import PrivacyGuard
from studyai.systems.system16.services.report_generator import ReportGenerator
from studyai.systems.system16.services.requirement_structurer import RequirementStructurer
from studyai.systems.system16.services.skill_normalizer import SkillNormalizer
from studyai.systems.system16.services.skillsheet_parser import SkillsheetParser
from studyai.systems.system16.services.text_extractor import TextExtractor
from studyai.systems.system16.utils.mlflow_tracer import MLflowTracer, MatchTrace


class MatchingService:
    def __init__(self) -> None:
        self.normalizer = SkillNormalizer()
        self.requirement_structurer = RequirementStructurer()
        self.text_extractor = TextExtractor()
        self.skillsheet_parser = SkillsheetParser()
        self.candidate_profiler = CandidateProfiler()
        self.match_scorer = MatchScorer()
        self.past_case_retriever = PastCaseRetriever()
        self.report_generator = ReportGenerator()
        self.embedding_client = EmbeddingClient()
        self.audit_logger = get_audit_logger()
        self.privacy_guard = PrivacyGuard()
        self.mlflow_tracer = MLflowTracer()

    async def match_text(
        self,
        session: AsyncSession,
        *,
        body: MatchRequest,
        trace_id: str,
        user_id: str | None,
    ) -> MatchResponse:
        started_at = perf_counter()
        rules = await self.normalizer.load_alias_rules(session)
        requirement = await self.requirement_structurer.parse_requirement(body.requirement_text, rules)
        candidate_profile = self.candidate_profiler.build_from_text(body.candidate_text, rules)
        return await self._create_match(
            session,
            requirement_text=body.requirement_text,
            requirement=requirement,
            candidate_profile=candidate_profile,
            candidate_id=None,
            bulk_id=None,
            trace_id=trace_id,
            user_id=user_id,
            mode="text",
            started_at=started_at,
        )

    async def match_files(
        self,
        session: AsyncSession,
        *,
        requirement_file_name: str,
        requirement_file_bytes: bytes,
        candidate_file_name: str,
        candidate_file_bytes: bytes,
        trace_id: str,
        user_id: str | None,
    ) -> MatchResponse:
        started_at = perf_counter()
        requirement_text = self.text_extractor.extract_requirement_text(requirement_file_name, requirement_file_bytes)
        parsed = await self.parse_skillsheet(session, file_name=candidate_file_name, file_bytes=candidate_file_bytes)
        candidate_profile = self.candidate_profiler.build_from_parsed_skillsheet(parsed.model_dump())
        rules = await self.normalizer.load_alias_rules(session)
        requirement = await self.requirement_structurer.parse_requirement(requirement_text, rules)
        return await self._create_match(
            session,
            requirement_text=requirement_text,
            requirement=requirement,
            candidate_profile=candidate_profile,
            candidate_id=self.privacy_guard.anonymize_candidate_id(Path(candidate_file_name).stem),
            bulk_id=None,
            trace_id=trace_id,
            user_id=user_id,
            mode="file",
            started_at=started_at,
        )

    async def match_bulk(
        self,
        session: AsyncSession,
        *,
        requirement_text: str,
        candidates: list[tuple[str, bytes]],
        trace_id: str,
        user_id: str | None,
    ) -> BulkMatchResponse:
        if not candidates:
            raise ValidationAppError("empty_candidate_files", "At least one candidate file is required.")
        repository = MatchRepository(session)
        bulk_id = await repository.get_next_bulk_id()
        rules = await self.normalizer.load_alias_rules(session)
        requirement = await self.requirement_structurer.parse_requirement(requirement_text, rules)
        items: list[BulkMatchItemResponse] = []
        for file_name, file_bytes in candidates:
            started_at = perf_counter()
            parsed = await self.parse_skillsheet(session, file_name=file_name, file_bytes=file_bytes)
            candidate_profile = self.candidate_profiler.build_from_parsed_skillsheet(parsed.model_dump())
            response = await self._create_match(
                session,
                requirement_text=requirement_text,
                requirement=requirement,
                candidate_profile=candidate_profile,
                candidate_id=self.privacy_guard.anonymize_candidate_id(Path(file_name).stem),
                bulk_id=bulk_id,
                trace_id=trace_id,
                user_id=user_id,
                commit=False,
                mode="bulk",
                started_at=started_at,
            )
            items.append(BulkMatchItemResponse(**response.model_dump()))
        await session.commit()
        self.audit_logger.log(
            action="system16.match.bulk",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system16_bulk_match",
            resource_id=bulk_id,
            details={"count": len(items)},
        )
        return BulkMatchResponse(bulk_id=bulk_id, total_candidates=len(items), results=items)

    async def parse_skillsheet(self, session: AsyncSession, *, file_name: str, file_bytes: bytes) -> SkillsheetParseResponse:
        rules = await self.normalizer.load_alias_rules(session)
        return SkillsheetParseResponse(**self.skillsheet_parser.parse_skillsheet(file_name, file_bytes, rules))

    async def create_past_case(
        self,
        session: AsyncSession,
        *,
        body: PastCaseCreateRequest,
        trace_id: str,
        user_id: str | None,
    ) -> PastCaseCreateResponse:
        embedding = None
        masked_profile = self.privacy_guard.mask_text(body.candidate_profile or "") or None
        masked_notes = self.privacy_guard.mask_text(body.notes or "") or None
        combined = "\n".join(part for part in [body.requirement_summary, masked_profile or "", masked_notes or ""] if part)
        try:
            embedding = (await self.embedding_client.embed([combined]))[0]
        except Exception:
            embedding = None
        record = await MatchRepository(session).create_past_case(
            requirement_summary=body.requirement_summary,
            candidate_profile=masked_profile,
            result_label=body.result,
            notes=masked_notes,
            embedding=embedding,
        )
        await session.commit()
        self.audit_logger.log(
            action="system16.past_case.create",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system16_past_case",
            resource_id=record.id,
        )
        return PastCaseCreateResponse(knowledge_id=record.id, created_at=record.created_at)

    async def list_matches(
        self,
        session: AsyncSession,
        *,
        limit: int,
        review_required: bool | None,
        bulk_id: int | None,
    ) -> MatchListResponse:
        records = await MatchRepository(session).list_matches(limit=limit, review_required=review_required, bulk_id=bulk_id)
        return MatchListResponse(
            total=len(records),
            items=[
                MatchListItem(
                    match_id=record.id,
                    score=float(record.score),
                    level=record.level or "C",
                    review_required=record.review_required,
                    bulk_id=record.bulk_id,
                    candidate_id=record.candidate_id,
                    created_at=record.created_at,
                )
                for record in records
            ],
        )

    async def get_match(self, session: AsyncSession, *, match_id: int) -> MatchResponse:
        return self._to_match_response(await MatchRepository(session).get_match(match_id))

    async def export_matches_csv(
        self,
        session: AsyncSession,
        *,
        review_required: bool | None,
        bulk_id: int | None,
    ) -> str:
        records = await MatchRepository(session).list_matches(
            limit=100,
            review_required=review_required,
            bulk_id=bulk_id,
        )
        output = StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(
            [
                "match_id",
                "candidate_id",
                "bulk_id",
                "score",
                "level",
                "parse_confidence",
                "review_required",
                "review_reasons",
                "created_at",
            ]
        )
        for record in records:
            writer.writerow(
                [
                    record.id,
                    record.candidate_id or "",
                    record.bulk_id or "",
                    float(record.score),
                    record.level or "C",
                    float(record.parse_confidence or 0.0),
                    str(record.review_required).lower(),
                    ";".join(record.review_reasons or []),
                    record.created_at.isoformat(),
                ]
            )
        return output.getvalue()

    async def _create_match(
        self,
        session: AsyncSession,
        *,
        requirement_text: str,
        requirement: dict,
        candidate_profile: dict,
        candidate_id: str | None,
        bulk_id: int | None,
        trace_id: str,
        user_id: str | None,
        mode: str,
        started_at: float,
        commit: bool = True,
    ) -> MatchResponse:
        try:
            repository = MatchRepository(session)
            similar_cases = await self.past_case_retriever.retrieve_cases(
                session,
                requirement_text=requirement_text,
                candidate_profile_summary=self.candidate_profiler.summarize_profile(candidate_profile),
            )
            scoring_result = self.match_scorer.score_match(requirement, candidate_profile)
            report = self.report_generator.generate_report(requirement, candidate_profile, scoring_result)
            record = await repository.create_match(
                requirement_text=requirement_text,
                candidate_data_masked=self.privacy_guard.mask_candidate_data(candidate_profile),
                score=scoring_result["score"],
                level=scoring_result["level"],
                parse_confidence=float(candidate_profile["parse_confidence"]),
                review_required=scoring_result["review_required"],
                review_reasons=scoring_result["review_reasons"],
                score_breakdown=scoring_result["score_breakdown"],
                report=report,
                similar_cases=similar_cases,
                bulk_id=bulk_id,
                candidate_id=candidate_id,
            )
            if commit:
                await session.commit()
            self.audit_logger.log(
                action="system16.match.created",
                trace_id=trace_id,
                user_id=user_id,
                resource_type="system16_match",
                resource_id=record.id,
                details={"score": scoring_result["score"], "level": scoring_result["level"], "bulk_id": bulk_id},
            )
            await self.mlflow_tracer.record(
                MatchTrace(
                    mode=mode,
                    trace_id=trace_id,
                    latency_ms=(perf_counter() - started_at) * 1000,
                    status="succeeded",
                    score=float(scoring_result["score"]),
                    parse_confidence=float(candidate_profile["parse_confidence"]),
                    review_required=bool(scoring_result["review_required"]),
                    similar_case_count=len(similar_cases),
                    candidate_id=candidate_id,
                    bulk_id=bulk_id,
                )
            )
            return self._to_match_response(record)
        except Exception as exc:
            await self.mlflow_tracer.record(
                MatchTrace(
                    mode=mode,
                    trace_id=trace_id,
                    latency_ms=(perf_counter() - started_at) * 1000,
                    status="failed",
                    candidate_id=candidate_id,
                    bulk_id=bulk_id,
                    error_type=type(exc).__name__,
                )
            )
            raise

    @staticmethod
    def _to_match_response(record) -> MatchResponse:
        return MatchResponse(
            match_id=record.id,
            score=float(record.score),
            level=record.level or "C",
            parse_confidence=float(record.parse_confidence or 0.0),
            review_required=record.review_required,
            review_reasons=list(record.review_reasons or []),
            score_breakdown=ScoreBreakdown(**record.score_breakdown),
            report=MatchReport(**record.report),
            similar_cases=[SimilarCaseResponse(**case) for case in (record.similar_cases or [])],
            bulk_id=record.bulk_id,
            candidate_id=record.candidate_id,
            created_at=record.created_at,
        )
