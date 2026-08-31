from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.auth.models import AuthenticatedUser
from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ExternalServiceError, ValidationAppError
from studyai.systems.system07.repositories.catalog_repository import CatalogRepository
from studyai.systems.system07.repositories.tag_repository import TagRepository
from studyai.systems.system07.schemas.catalog import (
    BulkDocumentUploadResponse,
    DocumentDetailResponse,
    DocumentListItemResponse,
    DocumentListResponse,
    DocumentUploadResponse,
    SimilarDocumentItem,
    SimilarDocumentsResponse,
)
from studyai.systems.system07.services.chunk_service import ChunkService
from studyai.systems.system07.services.similarity_engine import SimilarityEngine
from studyai.systems.system07.services.tagging_engine import TaggingEngine
from studyai.systems.system07.services.text_extractor import TextExtractor


class CatalogService:
    TOKEN_PATTERN = re.compile(r"[0-9A-Za-z_]+|[ぁ-んァ-ン一-龥]{2,}")

    def __init__(self) -> None:
        self.text_extractor = TextExtractor()
        self.chunk_service = ChunkService()
        self.embedding_client = EmbeddingClient()
        self.tagging_engine = TaggingEngine()
        self.similarity_engine = SimilarityEngine()
        self.audit_logger = get_audit_logger()

    async def upload_document(
        self,
        session: AsyncSession,
        *,
        file_name: str,
        file_bytes: bytes,
        registered_by: str,
        access_roles: list[str],
        trace_id: str,
    ) -> DocumentUploadResponse:
        self.text_extractor.validate_file_name(file_name)
        if not registered_by.strip():
            raise ValidationAppError("invalid_registered_by", "registered_by は必須です。")
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        repository = CatalogRepository(session)
        await repository.ensure_hash_available(file_hash)

        text = self.text_extractor.extract_text(file_name, file_bytes)
        if not text:
            raise ValidationAppError("empty_document_text", "ドキュメント本文を抽出できませんでした。")
        chunks = self.chunk_service.make_chunks(text)
        if not chunks:
            raise ValidationAppError("empty_document_text", "ドキュメント本文が空です。")

        embeddings = await self._embed_texts([str(chunk["chunk_text"]) for chunk in chunks])
        for chunk, embedding in zip(chunks, embeddings, strict=True):
            chunk["embedding"] = embedding

        tag_repository = TagRepository(session)
        auto_tags = await self.tagging_engine.analyze_document(text, await tag_repository.list_tag_names())
        tag_models = await tag_repository.get_or_create_tags(auto_tags.tags)
        document = await repository.create_document(
            file_name=file_name,
            title=Path(file_name).stem,
            file_hash=file_hash,
            file_size=len(file_bytes),
            registered_by=registered_by,
            access_roles=access_roles,
            category=auto_tags.category,
            sub_category=auto_tags.sub_category,
            document_type=auto_tags.document_type,
            importance=auto_tags.importance,
            summary=auto_tags.summary,
            chunks=chunks,
        )
        await repository.replace_document_tags(document.id, tag_ids=[tag.id for tag in tag_models], is_auto=True)
        await tag_repository.refresh_use_counts()
        await session.commit()

        self.audit_logger.log(
            action="system07.document.uploaded",
            trace_id=trace_id,
            user_id=registered_by,
            resource_type="system07_document",
            resource_id=document.id,
            details={"file_name": file_name},
        )
        return DocumentUploadResponse(document_id=document.id, file_name=document.file_name, auto_tags=auto_tags)

    async def upload_documents_bulk(
        self,
        session: AsyncSession,
        *,
        files: list[tuple[str, bytes]],
        registered_by: str,
        access_roles: list[str],
        trace_id: str,
    ) -> BulkDocumentUploadResponse:
        items: list[DocumentUploadResponse] = []
        for file_name, file_bytes in files:
            items.append(
                await self.upload_document(
                    session,
                    file_name=file_name,
                    file_bytes=file_bytes,
                    registered_by=registered_by,
                    access_roles=access_roles,
                    trace_id=trace_id,
                )
            )
        return BulkDocumentUploadResponse(items=items)

    async def list_documents(
        self,
        session: AsyncSession,
        *,
        keyword: str | None,
        category: str | None,
        tags: list[str],
        document_type: str | None,
        importance: str | None,
        registered_by: str | None,
        search_mode: str,
        user: AuthenticatedUser | None,
        trace_id: str,
    ) -> DocumentListResponse:
        if search_mode not in {"keyword", "vector", "hybrid"}:
            raise ValidationAppError("invalid_search_mode", "search_mode は keyword / vector / hybrid のみ指定できます。")
        normalized_tags = [TagRepository.normalize_tag_name(tag) for tag in tags if tag.strip()]
        documents = await CatalogRepository(session).list_documents(
            keyword=keyword if search_mode == "keyword" else None,
            category=category,
            tags=normalized_tags,
            document_type=document_type,
            importance=importance,
            registered_by=registered_by,
        )
        ranked = await self._rank_documents(documents=documents, keyword=keyword, search_mode=search_mode)

        user_id = self._resolve_user_id(user)
        repository = CatalogRepository(session)
        for document in ranked:
            await repository.log_access(document_id=document.id, user_id=user_id, action="search", query=keyword)
        await session.commit()

        self.audit_logger.log(
            action="system07.document.search",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system07_document",
            details={"keyword": keyword or "", "count": len(ranked)},
        )
        return DocumentListResponse(total=len(ranked), items=[self._to_list_item(document) for document in ranked])

    async def get_document_detail(
        self,
        session: AsyncSession,
        *,
        document_id: int,
        user: AuthenticatedUser | None,
        trace_id: str,
    ) -> DocumentDetailResponse:
        repository = CatalogRepository(session)
        document = await repository.get_document(document_id)
        await repository.increment_view_count(document_id)
        await repository.log_access(document_id=document_id, user_id=self._resolve_user_id(user), action="view")
        await session.refresh(document, attribute_names=["updated_at", "view_count"])
        response = DocumentDetailResponse(
            **self._to_list_item(document).model_dump(),
            file_size=document.file_size,
            access_roles=document.access_roles,
            view_count=document.view_count + 1,
        )
        await session.commit()

        self.audit_logger.log(
            action="system07.document.view",
            trace_id=trace_id,
            user_id=self._resolve_user_id(user),
            resource_type="system07_document",
            resource_id=document_id,
        )
        return response

    async def get_similar_documents(
        self,
        session: AsyncSession,
        *,
        document_id: int,
        user: AuthenticatedUser | None,
        trace_id: str,
    ) -> SimilarDocumentsResponse:
        repository = CatalogRepository(session)
        target = await repository.get_document(document_id)
        candidates = await repository.list_active_documents_with_chunks(exclude_document_id=document_id)
        similar_items = self.similarity_engine.find_similar(target_document=target, candidate_documents=candidates)
        await repository.log_access(
            document_id=document_id,
            user_id=self._resolve_user_id(user),
            action="recommend",
        )
        await session.commit()

        self.audit_logger.log(
            action="system07.document.similar",
            trace_id=trace_id,
            user_id=self._resolve_user_id(user),
            resource_type="system07_document",
            resource_id=document_id,
            details={"count": len(similar_items)},
        )
        return SimilarDocumentsResponse(
            document_id=document_id,
            similar_documents=[
                SimilarDocumentItem(
                    document_id=item["document"].id,
                    file_name=item["document"].file_name,
                    similarity_score=float(item["similarity_score"]),
                    summary=item["document"].summary,
                    tags=[relation.tag.normalized_name for relation in item["document"].tags],
                    registered_at=item["document"].created_at,
                    registered_by=item["document"].registered_by,
                )
                for item in similar_items
            ],
        )

    async def _rank_documents(self, *, documents: list, keyword: str | None, search_mode: str) -> list:
        if not keyword:
            return documents
        query_embedding: list[float] | None = None
        if search_mode in {"vector", "hybrid"}:
            query_embedding = (await self._embed_texts([keyword]))[0]

        ranked: list[tuple[float, object]] = []
        for document in documents:
            keyword_score = self._keyword_score(keyword, document)
            vector_score = self._vector_score(query_embedding, document) if query_embedding else 0.0
            if search_mode == "keyword":
                score = keyword_score
            elif search_mode == "vector":
                score = vector_score
            else:
                score = keyword_score * 0.4 + vector_score * 0.6
            ranked.append((score, document))
        ranked.sort(key=lambda item: (item[0], item[1].updated_at, item[1].id), reverse=True)
        return [document for score, document in ranked if score > 0]

    async def _embed_texts(self, texts: list[str]) -> list[list[float]]:
        try:
            return await self.embedding_client.embed(texts)
        except ExternalServiceError:
            return [self._local_embedding(text) for text in texts]

    @classmethod
    def _local_embedding(cls, text: str, dimensions: int = 768) -> list[float]:
        tokens: list[str] = []
        for token in cls.TOKEN_PATTERN.findall(text.lower()):
            tokens.append(token)
            if re.fullmatch(r"[ぁ-んァ-ン一-龥]{3,}", token):
                tokens.extend(token[index : index + 2] for index in range(len(token) - 1))

        vector = [0.0] * dimensions
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % dimensions
            vector[index] += 1.0

        length = sum(value * value for value in vector) ** 0.5
        return [value / length for value in vector] if length else vector

    def _keyword_score(self, keyword: str, document) -> float:
        query_tokens = {token.lower() for token in self.TOKEN_PATTERN.findall(keyword)}
        if not query_tokens:
            return 0.0
        combined_text = "\n".join(
            [
                document.file_name or "",
                document.title or "",
                document.summary or "",
                "\n".join(chunk.chunk_text for chunk in document.chunks[:3]),
            ]
        )
        document_tokens = {token.lower() for token in self.TOKEN_PATTERN.findall(combined_text)}
        if not document_tokens:
            return 0.0
        return len(query_tokens & document_tokens) / len(query_tokens)

    def _vector_score(self, query_embedding: list[float], document) -> float:
        best = 0.0
        for chunk in document.chunks:
            if chunk.embedding:
                best = max(best, self.similarity_engine._cosine_similarity(query_embedding, chunk.embedding))
        return best

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
    def parse_tags(raw_value: str | None) -> list[str]:
        if not raw_value:
            return []
        return [item.strip() for item in raw_value.split(",") if item.strip()]

    @staticmethod
    def _resolve_user_id(user: AuthenticatedUser | None) -> str:
        return user.user_id if user is not None else "anonymous"

    @staticmethod
    def _to_list_item(document) -> DocumentListItemResponse:
        return DocumentListItemResponse(
            document_id=document.id,
            file_name=document.file_name,
            category=document.category,
            sub_category=document.sub_category,
            document_type=document.document_type,
            importance=document.importance,
            summary=document.summary,
            registered_by=document.registered_by,
            created_at=document.created_at,
            updated_at=document.updated_at,
            tags=[relation.tag.normalized_name for relation in document.tags if relation.tag is not None],
        )
