from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.audit.logger import get_audit_logger
from studyai.systems.system07.repositories.catalog_repository import CatalogRepository
from studyai.systems.system07.repositories.tag_repository import TagRepository
from studyai.systems.system07.schemas.catalog import TagListResponse, TagMergeResponse, UpdateTagsResponse


class TagAdminService:
    def __init__(self) -> None:
        self.audit_logger = get_audit_logger()

    async def update_tags(
        self,
        session: AsyncSession,
        *,
        document_id: int,
        tags: list[str],
        category: str | None,
        sub_category: str | None,
        importance: str | None,
        user_id: str,
        trace_id: str,
    ) -> UpdateTagsResponse:
        tag_repository = TagRepository(session)
        tag_models = await tag_repository.get_or_create_tags(tags)
        document = await CatalogRepository(session).replace_document_tags(
            document_id,
            tag_ids=[tag.id for tag in tag_models],
            is_auto=False,
            category=category,
            sub_category=sub_category,
            importance=importance,
        )
        await tag_repository.refresh_use_counts()
        await session.commit()
        self.audit_logger.log(
            action="system07.tag.update",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system07_document",
            resource_id=document_id,
            details={"tag_count": len(tag_models)},
        )
        return UpdateTagsResponse(
            document_id=document.id,
            tags=[tag.normalized_name for tag in tag_models],
            category=document.category,
            sub_category=document.sub_category,
            importance=document.importance,
        )

    async def list_tags(self, session: AsyncSession) -> TagListResponse:
        items = await TagRepository(session).list_tags()
        return TagListResponse(
            items=[
                {
                    "name": item.normalized_name,
                    "synonyms": item.synonyms,
                    "use_count": item.use_count,
                }
                for item in items
            ]
        )

    async def merge_tags(
        self,
        session: AsyncSession,
        *,
        source_tags: list[str],
        target_tag: str,
        user_id: str,
        trace_id: str,
    ) -> TagMergeResponse:
        tag_repository = TagRepository(session)
        source_ids, target = await tag_repository.merge_tags(source_tags=source_tags, target_tag=target_tag)
        merged_count = await CatalogRepository(session).reassign_tag_relations(
            source_tag_ids=source_ids,
            target_tag_id=target.id,
        )
        await tag_repository.refresh_use_counts()
        await session.commit()
        self.audit_logger.log(
            action="system07.tag.merge",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system07_tag",
            resource_id=target.id,
            details={"merged_count": merged_count},
        )
        return TagMergeResponse(merged_count=merged_count, target_tag=target.normalized_name)
