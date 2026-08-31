from __future__ import annotations

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system13.repositories.knowledge_repository import KnowledgeRepository
from studyai.systems.system13.repositories.member_repository import MemberRepository
from studyai.systems.system13.repositories.project_repository import ProjectRepository
from studyai.systems.system13.schemas.education import (
    KnowledgeCreateRequest,
    KnowledgeCreateResponse,
    KnowledgeListItemResponse,
    KnowledgeListResponse,
)
from studyai.systems.system13.services.text_extractor import TextExtractor


class KnowledgeIngestionService:
    VALID_IMPORTANCE = {"high", "medium", "low"}
    VALID_SOURCE_TYPES = {"official", "informal", "file"}

    def __init__(self) -> None:
        self.embedding_client = EmbeddingClient()
        self.text_extractor = TextExtractor()
        self.audit_logger = get_audit_logger()

    async def create_from_text(
        self,
        session: AsyncSession,
        request: KnowledgeCreateRequest,
        *,
        trace_id: str | None = None,
    ) -> KnowledgeCreateResponse:
        self._validate_enums(request.importance, request.source_type)
        content = request.content.strip()
        if not content:
            raise ValidationAppError("empty_knowledge_content", "Knowledge content must not be empty.")
        await ProjectRepository(session).get_or_create(request.project_id)
        if request.registered_by:
            await MemberRepository(session).get_or_create(
                project_id=request.project_id,
                user_id=request.registered_by,
            )
        embedding = (await self.embedding_client.embed([content]))[0]
        record = await KnowledgeRepository(session).create_knowledge(
            project_id=request.project_id,
            category=request.category.strip() or "general",
            title=request.title.strip(),
            content=content,
            importance=request.importance,
            is_landmine=request.is_landmine,
            registered_by=request.registered_by,
            source_type=request.source_type,
            embedding=embedding,
        )
        await session.commit()
        self.audit_logger.log(
            action="system13.create_knowledge",
            actor=request.registered_by,
            target_type="knowledge",
            target_id=str(record.id),
            trace_id=trace_id,
            metadata={"project_id": request.project_id, "title": record.title},
        )
        return KnowledgeCreateResponse(
            knowledge_id=record.id,
            project_id=record.project_id,
            title=record.title,
            category=record.category,
            importance=record.importance,
            is_landmine=record.is_landmine,
            registered_by=record.registered_by,
        )

    async def create_from_file(
        self,
        session: AsyncSession,
        *,
        project_id: str,
        category: str,
        file_name: str,
        file_bytes: bytes,
        importance: str,
        is_landmine: bool,
        registered_by: str | None,
        trace_id: str | None = None,
    ) -> KnowledgeCreateResponse:
        text = self.text_extractor.extract_text(file_name, file_bytes)
        if not text:
            raise ValidationAppError("empty_knowledge_content", "The uploaded file did not contain readable text.")
        return await self.create_from_text(
            session,
            KnowledgeCreateRequest(
                project_id=project_id,
                category=category,
                title=Path(file_name).stem,
                content=text,
                importance=importance,
                is_landmine=is_landmine,
                registered_by=registered_by,
                source_type="file",
            ),
            trace_id=trace_id,
        )

    async def list_knowledge(
        self,
        session: AsyncSession,
        *,
        project_id: str,
        category: str | None = None,
        importance: str | None = None,
        search: str | None = None,
        include_inactive: bool = False,
    ) -> KnowledgeListResponse:
        total, items = await KnowledgeRepository(session).list_knowledge(
            project_id=project_id,
            category=category,
            importance=importance,
            search=search,
            include_inactive=include_inactive,
        )
        return KnowledgeListResponse(
            total=total,
            items=[
                KnowledgeListItemResponse(
                    knowledge_id=item.id,
                    project_id=item.project_id,
                    category=item.category,
                    title=item.title,
                    importance=item.importance,
                    is_landmine=item.is_landmine,
                    registered_by=item.registered_by,
                    source_type=item.source_type,
                    is_active=item.is_active,
                    created_at=item.created_at,
                    updated_at=item.updated_at,
                )
                for item in items
            ],
        )

    def _validate_enums(self, importance: str, source_type: str) -> None:
        if importance not in self.VALID_IMPORTANCE:
            raise ValidationAppError("invalid_importance", "importance must be one of high, medium, low.")
        if source_type not in self.VALID_SOURCE_TYPES:
            raise ValidationAppError("invalid_source_type", "source_type must be official, informal, or file.")
