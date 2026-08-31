from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from studyai.common.errors.models import ConflictAppError, NotFoundAppError
from studyai.systems.system07.models.catalog import (
    System07AccessLog,
    System07Document,
    System07DocumentChunk,
    System07DocumentTag,
    System07Tag,
)


class CatalogRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_hash(self, file_hash: str) -> System07Document | None:
        result = await self.session.execute(
            select(System07Document).where(System07Document.file_hash == file_hash)
        )
        return result.scalar_one_or_none()

    async def ensure_hash_available(self, file_hash: str) -> None:
        existing = await self.get_by_hash(file_hash)
        if existing is not None:
            raise ConflictAppError(
                "duplicate_document",
                "同じファイルは既に登録されています。",
                {"existing_id": existing.id},
            )

    async def get_document(self, document_id: int) -> System07Document:
        result = await self.session.execute(
            select(System07Document)
            .options(
                selectinload(System07Document.tags).selectinload(System07DocumentTag.tag),
                selectinload(System07Document.chunks),
            )
            .where(System07Document.id == document_id, System07Document.is_active.is_(True))
        )
        document = result.scalar_one_or_none()
        if document is None:
            raise NotFoundAppError("document_not_found", "対象ドキュメントが見つかりません。")
        return document

    async def create_document(
        self,
        *,
        file_name: str,
        title: str,
        file_hash: str,
        file_size: int,
        registered_by: str,
        access_roles: list[str],
        category: str | None,
        sub_category: str | None,
        document_type: str | None,
        importance: str | None,
        summary: str | None,
        chunks: list[dict[str, object]],
    ) -> System07Document:
        document = System07Document(
            file_name=file_name,
            title=title,
            file_hash=file_hash,
            file_size=file_size,
            registered_by=registered_by,
            access_roles=access_roles,
            category=category,
            sub_category=sub_category,
            document_type=document_type,
            importance=importance,
            summary=summary,
            is_active=True,
        )
        document.chunks = [
            System07DocumentChunk(
                chunk_no=int(chunk["chunk_no"]),
                chunk_text=str(chunk["chunk_text"]),
                section=chunk.get("section"),
                embedding=chunk.get("embedding"),
            )
            for chunk in chunks
        ]
        self.session.add(document)
        await self.session.flush()
        await self.session.refresh(document)
        return document

    async def list_documents(
        self,
        *,
        keyword: str | None,
        category: str | None,
        tags: list[str],
        document_type: str | None,
        importance: str | None,
        registered_by: str | None,
    ) -> list[System07Document]:
        stmt = (
            select(System07Document)
            .options(selectinload(System07Document.tags).selectinload(System07DocumentTag.tag))
            .where(System07Document.is_active.is_(True))
        )
        if category:
            stmt = stmt.where(System07Document.category == category)
        if document_type:
            stmt = stmt.where(System07Document.document_type == document_type)
        if importance:
            stmt = stmt.where(System07Document.importance == importance)
        if registered_by:
            stmt = stmt.where(System07Document.registered_by == registered_by)
        if keyword:
            keyword_like = f"%{keyword}%"
            stmt = stmt.where(
                or_(
                    System07Document.file_name.ilike(keyword_like),
                    System07Document.title.ilike(keyword_like),
                    System07Document.summary.ilike(keyword_like),
                )
            )
        if tags:
            stmt = (
                stmt.join(System07Document.tags)
                .join(System07DocumentTag.tag)
                .where(func.lower(System07Tag.normalized_name).in_(tags))
                .group_by(System07Document.id)
                .having(func.count(System07Document.id) >= len(tags))
            )
        result = await self.session.execute(
            stmt.order_by(System07Document.updated_at.desc(), System07Document.id.desc())
        )
        return list(result.scalars().unique().all())

    async def list_active_documents_with_chunks(
        self,
        *,
        exclude_document_id: int | None = None,
    ) -> list[System07Document]:
        stmt = (
            select(System07Document)
            .options(
                selectinload(System07Document.chunks),
                selectinload(System07Document.tags).selectinload(System07DocumentTag.tag),
            )
            .where(System07Document.is_active.is_(True))
        )
        if exclude_document_id is not None:
            stmt = stmt.where(System07Document.id != exclude_document_id)
        result = await self.session.execute(
            stmt.order_by(System07Document.updated_at.desc(), System07Document.id.desc())
        )
        return list(result.scalars().unique().all())

    async def replace_document_tags(
        self,
        document_id: int,
        *,
        tag_ids: list[int],
        is_auto: bool,
        category: str | None = None,
        sub_category: str | None = None,
        importance: str | None = None,
    ) -> System07Document:
        document = await self.get_document(document_id)
        document.tags = [
            System07DocumentTag(document_id=document_id, tag_id=tag_id, is_auto=is_auto)
            for tag_id in tag_ids
        ]
        if category is not None:
            document.category = category
        if sub_category is not None:
            document.sub_category = sub_category
        if importance is not None:
            document.importance = importance
        await self.session.flush()
        await self.session.refresh(document)
        return document

    async def increment_view_count(self, document_id: int) -> None:
        document = await self.get_document(document_id)
        document.view_count += 1
        await self.session.flush()

    async def log_access(
        self,
        *,
        document_id: int,
        user_id: str,
        action: str,
        query: str | None = None,
    ) -> None:
        self.session.add(
            System07AccessLog(
                document_id=document_id,
                user_id=user_id,
                action=action,
                query=query,
            )
        )
        await self.session.flush()

    async def list_access_stats(
        self,
        *,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 20,
    ) -> list[tuple[int, str, int]]:
        stmt = (
            select(
                System07Document.id,
                System07Document.file_name,
                func.count(System07AccessLog.id).label("access_count"),
            )
            .join(System07AccessLog, System07AccessLog.document_id == System07Document.id)
            .where(System07Document.is_active.is_(True))
        )
        if from_date is not None:
            stmt = stmt.where(System07AccessLog.accessed_at >= from_date)
        if to_date is not None:
            stmt = stmt.where(System07AccessLog.accessed_at <= to_date)
        rows = await self.session.execute(
            stmt.group_by(System07Document.id, System07Document.file_name)
            .order_by(func.count(System07AccessLog.id).desc(), System07Document.id.asc())
            .limit(limit)
        )
        return [(int(row.id), str(row.file_name), int(row.access_count)) for row in rows]

    async def list_unused_documents(
        self,
        *,
        before_date: datetime | None = None,
    ) -> list[tuple[System07Document, datetime | None]]:
        latest_access_subquery = (
            select(
                System07AccessLog.document_id.label("document_id"),
                func.max(System07AccessLog.accessed_at).label("last_accessed_at"),
            )
            .group_by(System07AccessLog.document_id)
            .subquery()
        )
        stmt = (
            select(System07Document, latest_access_subquery.c.last_accessed_at)
            .outerjoin(
                latest_access_subquery,
                latest_access_subquery.c.document_id == System07Document.id,
            )
            .where(System07Document.is_active.is_(True))
        )
        if before_date is not None:
            stmt = stmt.where(
                or_(
                    latest_access_subquery.c.last_accessed_at.is_(None),
                    latest_access_subquery.c.last_accessed_at < before_date,
                )
            )
        rows = await self.session.execute(
            stmt.order_by(System07Document.updated_at.asc(), System07Document.id.asc())
        )
        return [(row[0], row[1]) for row in rows.all()]

    async def reassign_tag_relations(self, *, source_tag_ids: list[int], target_tag_id: int) -> int:
        result = await self.session.execute(
            select(System07DocumentTag.document_id, System07DocumentTag.tag_id).where(
                System07DocumentTag.tag_id.in_(source_tag_ids)
            )
        )
        changed_documents: set[int] = set()
        for document_id, tag_id in result.all():
            changed_documents.add(int(document_id))
            existing = await self.session.execute(
                select(System07DocumentTag).where(
                    and_(
                        System07DocumentTag.document_id == document_id,
                        System07DocumentTag.tag_id == target_tag_id,
                    )
                )
            )
            if existing.scalar_one_or_none() is None:
                self.session.add(
                    System07DocumentTag(
                        document_id=int(document_id),
                        tag_id=target_tag_id,
                        is_auto=False,
                    )
                )
            duplicate_relation = await self.session.execute(
                select(System07DocumentTag).where(
                    and_(
                        System07DocumentTag.document_id == document_id,
                        System07DocumentTag.tag_id == tag_id,
                    )
                )
            )
            relation = duplicate_relation.scalar_one_or_none()
            if relation is not None:
                await self.session.delete(relation)
        await self.session.flush()
        return len(changed_documents)
