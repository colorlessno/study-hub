from __future__ import annotations

import hashlib
import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system03.repositories.document_repository import DocumentRepository
from studyai.systems.system03.schemas.qa import (
    DocumentListItemResponse,
    DocumentListResponse,
    DocumentRegisterResponse,
)
from studyai.systems.system03.services.chunk_service import ChunkService
from studyai.systems.system03.services.text_extractor import TextExtractor


class DocumentService:
    def __init__(self) -> None:
        self.text_extractor = TextExtractor()
        self.chunk_service = ChunkService()
        self.embedding_client = EmbeddingClient()

    async def register_document(
        self,
        session: AsyncSession,
        *,
        project_id: str,
        file_name: str,
        file_bytes: bytes,
        category: str,
        version: str | None,
        access_roles: list[str],
    ) -> DocumentRegisterResponse:
        if not project_id.strip():
            raise ValidationAppError("invalid_project_id", "project_id は必須です。")
        text = self.text_extractor.extract_text(file_name, file_bytes)
        if not text:
            raise ValidationAppError("empty_document_text", "文書本文を抽出できませんでした。")
        source_hash = self._compute_hash(file_bytes)
        repository = DocumentRepository(session)
        await repository.ensure_hash_available(source_hash)
        chunks = await self._build_chunks(text)
        document = await repository.create_document(
            project_id=project_id,
            file_name=file_name,
            title=Path(file_name).stem,
            category=category,
            version=version,
            access_roles=access_roles,
            source_hash=source_hash,
        )
        await repository.replace_chunks(document.id, chunks)
        await session.commit()
        return DocumentRegisterResponse(
            document_id=document.id,
            file_name=document.file_name,
            chunk_count=len(chunks),
            category=document.category,
            version=document.version,
        )

    async def update_document(
        self,
        session: AsyncSession,
        *,
        document_id: int,
        file_name: str,
        file_bytes: bytes,
        category: str,
        version: str | None,
        access_roles: list[str],
    ) -> DocumentRegisterResponse:
        text = self.text_extractor.extract_text(file_name, file_bytes)
        if not text:
            raise ValidationAppError("empty_document_text", "文書本文を抽出できませんでした。")
        source_hash = self._compute_hash(file_bytes)
        repository = DocumentRepository(session)
        await repository.ensure_hash_available(source_hash, current_document_id=document_id)
        chunks = await self._build_chunks(text)
        document = await repository.update_document(
            document_id,
            file_name=file_name,
            title=Path(file_name).stem,
            category=category,
            version=version,
            access_roles=access_roles,
            source_hash=source_hash,
        )
        await repository.replace_chunks(document.id, chunks)
        await session.commit()
        return DocumentRegisterResponse(
            document_id=document.id,
            file_name=document.file_name,
            chunk_count=len(chunks),
            category=document.category,
            version=document.version,
        )

    async def delete_document(self, session: AsyncSession, document_id: int) -> dict[str, object]:
        document = await DocumentRepository(session).soft_delete(document_id)
        await session.commit()
        return {"document_id": document.id, "status": "inactive"}

    async def list_documents(
        self,
        session: AsyncSession,
        *,
        project_id: str | None = None,
        category: str | None = None,
        include_inactive: bool = False,
    ) -> DocumentListResponse:
        total, items = await DocumentRepository(session).list_documents(
            project_id=project_id,
            category=category,
            include_inactive=include_inactive,
        )
        return DocumentListResponse(
            total=total,
            items=[
                DocumentListItemResponse(
                    document_id=item.id,
                    project_id=item.project_id,
                    file_name=item.file_name,
                    category=item.category,
                    version=item.version,
                    chunk_count=len(item.chunks),
                    is_active=item.is_active,
                    created_at=item.created_at,
                    updated_at=item.updated_at,
                )
                for item in items
            ],
        )

    async def _build_chunks(self, text: str) -> list[dict[str, object]]:
        chunks = self.chunk_service.make_chunks(text)
        if not chunks:
            raise ValidationAppError("empty_document_text", "文書をチャンク化できませんでした。")
        embeddings = await self.embedding_client.embed([str(chunk["chunk_text"]) for chunk in chunks])
        if len(embeddings) != len(chunks):
            raise ValidationAppError("embedding_count_mismatch", "embedding 数がチャンク数と一致しません。")
        for chunk, embedding in zip(chunks, embeddings, strict=True):
            chunk["embedding"] = embedding
        return chunks

    @staticmethod
    def parse_access_roles(raw_value: str | None) -> list[str]:
        if not raw_value:
            return []
        try:
            parsed = json.loads(raw_value)
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
        except json.JSONDecodeError:
            pass
        return [item.strip() for item in raw_value.split(",") if item.strip()]

    @staticmethod
    def _compute_hash(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()
