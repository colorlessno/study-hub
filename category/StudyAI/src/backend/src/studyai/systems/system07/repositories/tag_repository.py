from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError, ValidationAppError
from studyai.systems.system07.models.catalog import System07DocumentTag, System07Tag


class TagRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def normalize_tag_name(name: str) -> str:
        normalized = " ".join(name.strip().split())
        return normalized.casefold()

    async def list_tags(self) -> list[System07Tag]:
        result = await self.session.execute(
            select(System07Tag).order_by(System07Tag.use_count.desc(), System07Tag.normalized_name.asc())
        )
        return list(result.scalars().all())

    async def list_tag_names(self) -> list[str]:
        rows = await self.session.execute(select(System07Tag.normalized_name).order_by(System07Tag.normalized_name.asc()))
        return [str(value) for value in rows.scalars().all()]

    async def get_or_create_tags(self, names: list[str]) -> list[System07Tag]:
        normalized = [self.normalize_tag_name(name) for name in names if name.strip()]
        if not normalized:
            return []
        normalized = list(dict.fromkeys(normalized))
        result = await self.session.execute(
            select(System07Tag).where(System07Tag.normalized_name.in_(normalized))
        )
        existing = {tag.normalized_name: tag for tag in result.scalars().all()}

        tags: list[System07Tag] = []
        for item in normalized:
            tag = existing.get(item)
            if tag is None:
                tag = System07Tag(normalized_name=item, synonyms=[], use_count=0)
                self.session.add(tag)
                await self.session.flush()
                existing[item] = tag
            if tag.merged_to_tag is not None:
                tag = tag.merged_to_tag
            tags.append(tag)
        await self.session.flush()
        deduplicated: list[System07Tag] = []
        seen_ids: set[int] = set()
        for tag in tags:
            if tag.id in seen_ids:
                continue
            deduplicated.append(tag)
            seen_ids.add(tag.id)
        return deduplicated

    async def get_tag_by_name(self, name: str) -> System07Tag:
        normalized = self.normalize_tag_name(name)
        result = await self.session.execute(
            select(System07Tag).where(System07Tag.normalized_name == normalized)
        )
        tag = result.scalar_one_or_none()
        if tag is None:
            raise NotFoundAppError("tag_not_found", "対象タグが見つかりません。")
        if tag.merged_to_tag is not None:
            return tag.merged_to_tag
        return tag

    async def merge_tags(self, *, source_tags: list[str], target_tag: str) -> tuple[list[int], System07Tag]:
        source_normalized = [self.normalize_tag_name(tag) for tag in source_tags if tag.strip()]
        target_normalized = self.normalize_tag_name(target_tag)
        source_normalized = [tag for tag in dict.fromkeys(source_normalized) if tag != target_normalized]
        if not source_normalized:
            raise ValidationAppError("invalid_tag_merge", "統合元タグが不足しています。")

        target = await self.get_or_create_tags([target_normalized])
        target_tag_model = target[0]
        result = await self.session.execute(
            select(System07Tag).where(System07Tag.normalized_name.in_(source_normalized))
        )
        source_models = [tag for tag in result.scalars().all() if tag.id != target_tag_model.id]
        if not source_models:
            raise ValidationAppError("invalid_tag_merge", "統合元タグが存在しません。")

        source_ids: list[int] = []
        for source in source_models:
            source_ids.append(source.id)
            source.merged_to_tag_id = target_tag_model.id
            synonyms = set(target_tag_model.synonyms)
            synonyms.add(source.normalized_name)
            for item in source.synonyms:
                synonyms.add(str(item))
            target_tag_model.synonyms = sorted(synonyms)
        await self.session.flush()
        return source_ids, target_tag_model

    async def refresh_use_counts(self) -> None:
        counts = dict(
            (
                int(tag_id),
                int(use_count),
            )
            for tag_id, use_count in (
                await self.session.execute(
                    select(System07DocumentTag.tag_id, func.count(System07DocumentTag.document_id))
                    .group_by(System07DocumentTag.tag_id)
                )
            ).all()
        )
        result = await self.session.execute(select(System07Tag))
        for tag in result.scalars().all():
            tag.use_count = counts.get(tag.id, 0)
        await self.session.flush()
