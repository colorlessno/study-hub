from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system16.models.matching import System16SkillAlias


class SkillAliasRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_aliases(self) -> list[System16SkillAlias]:
        result = await self.session.execute(
            select(System16SkillAlias).order_by(
                System16SkillAlias.category.asc().nulls_last(),
                System16SkillAlias.canonical_name.asc(),
                System16SkillAlias.alias_name.asc(),
            )
        )
        return list(result.scalars().all())
