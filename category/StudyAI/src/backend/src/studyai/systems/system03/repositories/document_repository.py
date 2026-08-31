from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import ConflictAppError, NotFoundAppError
from studyai.systems.system03.models.document import System03Document, System03DocumentChunk


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, document_id: int) -> System03Document:
        result = await self.session.execute(
            select(System03Document).where(System03Document.id == document_id)
        )
        document = result.scalar_one_or_none()
        if document is None:
            raise NotFoundAppError("document_not_found", "対象の文書が見つかりません。")
        return document

    async def get_by_hash(self, source_hash: str) -> System03Document | None:
        result = await self.session.execute(
            select(System03Document).where(System03Document.source_hash == source_hash)
        )
        return result.scalar_one_or_none()

    async def ensure_hash_available(self, source_hash: str, current_document_id: int | None = None) -> None:
        existing = await self.get_by_hash(source_hash)
        if existing is not None and existing.id != current_document_id:
            raise ConflictAppError("duplicate_document", "同一内容の文書が既に登録されています。")

    async def create_document(
        self,
        *,
        project_id: str,
        file_name: str,
        title: str,
        category: str,
        version: str | None,
        access_roles: list[str],
        source_hash: str,
    ) -> System03Document:
        document = System03Document(
            project_id=project_id,
            file_name=file_name,
            title=title,
            category=category,
            version=version,
            access_roles=access_roles,
            source_hash=source_hash,
            is_active=True,
        )
        self.session.add(document)
        await self.session.flush()
        await self.session.refresh(document)
        return document

    async def update_document(
        self,
        document_id: int,
        *,
        file_name: str,
        title: str,
        category: str,
        version: str | None,
        access_roles: list[str],
        source_hash: str,
    ) -> System03Document:
        document = await self.get_by_id(document_id)
        document.file_name = file_name
        document.title = title
        document.category = category
        document.version = version
        document.access_roles = access_roles
        document.source_hash = source_hash
        document.is_active = True
        await self.session.flush()
        await self.session.refresh(document)
        return document

    async def replace_chunks(self, document_id: int, chunks: list[dict[str, object]]) -> None:
        await self.get_by_id(document_id)
        await self.session.execute(
            delete(System03DocumentChunk).where(
                System03DocumentChunk.document_id == document_id
            )
        )
        await self.session.flush()
        self.session.add_all([
            System03DocumentChunk(
                document_id=document_id,
                chunk_no=int(chunk["chunk_no"]),
                section_title=chunk.get("section_title"),
                chunk_text=str(chunk["chunk_text"]),
                embedding=chunk.get("embedding"),
                is_active=True,
            )
            for chunk in chunks
        ])
        await self.session.flush()

    async def soft_delete(self, document_id: int) -> System03Document:
        document = await self.get_by_id(document_id)
        document.is_active = False
        for chunk in document.chunks:
            chunk.is_active = False
        await self.session.flush()
        await self.session.refresh(document)
        return document

    async def list_documents(
        self,
        *,
        project_id: str | None = None,
        category: str | None = None,
        include_inactive: bool = False,
    ) -> tuple[int, list[System03Document]]:
        stmt = select(System03Document)
        count_stmt = select(func.count()).select_from(System03Document)
        filters = []
        if project_id:
            filters.append(System03Document.project_id == project_id)
        if category:
            filters.append(System03Document.category == category)
        if not include_inactive:
            filters.append(System03Document.is_active.is_(True))
        for condition in filters:
            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)
        stmt = stmt.order_by(System03Document.updated_at.desc(), System03Document.id.desc())
        total = (await self.session.execute(count_stmt)).scalar_one()
        items = (await self.session.execute(stmt)).scalars().all()
        return total, list(items)

    async def list_active_chunks(
        self,
        *,
        project_id: str,
        category_filter: list[str] | None = None,
    ) -> list[tuple[System03DocumentChunk, System03Document]]:
        stmt = (
            select(System03DocumentChunk, System03Document)
            .join(System03Document, System03DocumentChunk.document_id == System03Document.id)
            .where(
                System03Document.project_id == project_id,
                System03Document.is_active.is_(True),
                System03DocumentChunk.is_active.is_(True),
            )
        )
        if category_filter:
            stmt = stmt.where(System03Document.category.in_(category_filter))
        rows = await self.session.execute(
            stmt.order_by(System03Document.id.desc(), System03DocumentChunk.chunk_no.asc())
        )
        return list(rows.all())
