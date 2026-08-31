from __future__ import annotations

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system07.repositories.catalog_repository import CatalogRepository
from studyai.systems.system07.schemas.catalog import (
    AccessStatsDocument,
    AccessStatsResponse,
    UnusedDocumentItem,
    UnusedDocumentsResponse,
)


class AnalyticsService:
    async def get_access_stats(
        self,
        session: AsyncSession,
        *,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 20,
    ) -> AccessStatsResponse:
        rows = await CatalogRepository(session).list_access_stats(
            from_date=from_date,
            to_date=to_date,
            limit=limit,
        )
        return AccessStatsResponse(
            items=[
                AccessStatsDocument(document_id=document_id, file_name=file_name, access_count=access_count)
                for document_id, file_name, access_count in rows
            ]
        )

    async def get_unused_documents(
        self,
        session: AsyncSession,
        *,
        before_date: datetime | None = None,
    ) -> UnusedDocumentsResponse:
        rows = await CatalogRepository(session).list_unused_documents(before_date=before_date)
        return UnusedDocumentsResponse(
            items=[
                UnusedDocumentItem(
                    document_id=document.id,
                    file_name=document.file_name,
                    last_accessed_at=last_accessed_at,
                )
                for document, last_accessed_at in rows
            ]
        )
