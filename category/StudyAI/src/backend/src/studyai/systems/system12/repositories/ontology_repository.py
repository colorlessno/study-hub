from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from studyai.systems.system12.models.gift import System12NgRule, System12Recipient, System12Scene


class OntologyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_or_create_scene(
        self,
        *,
        name: str,
        formality: int | None = None,
        timing: str | None = None,
        description: str | None = None,
    ) -> System12Scene:
        result = await self.session.execute(
            select(System12Scene).where(System12Scene.name == name)
        )
        scene = result.scalar_one_or_none()
        if scene is not None:
            if formality is not None:
                scene.formality = formality
            if timing is not None:
                scene.timing = timing
            if description is not None:
                scene.description = description
            await self.session.flush()
            return scene
        scene = System12Scene(name=name, formality=formality, timing=timing, description=description)
        self.session.add(scene)
        await self.session.flush()
        await self.session.refresh(scene)
        return scene

    async def get_or_create_recipient(
        self,
        *,
        name: str,
        formality: int | None = None,
        description: str | None = None,
    ) -> System12Recipient:
        result = await self.session.execute(
            select(System12Recipient).where(System12Recipient.name == name)
        )
        recipient = result.scalar_one_or_none()
        if recipient is not None:
            if formality is not None:
                recipient.formality = formality
            if description is not None:
                recipient.description = description
            await self.session.flush()
            return recipient
        recipient = System12Recipient(name=name, formality=formality, description=description)
        self.session.add(recipient)
        await self.session.flush()
        await self.session.refresh(recipient)
        return recipient

    async def create_ng_rule(
        self,
        *,
        scene_id: int | None,
        recipient_id: int | None,
        ng_attribute: str,
        reason: str | None,
        severity: str,
    ) -> System12NgRule:
        rule = System12NgRule(
            scene_id=scene_id,
            recipient_id=recipient_id,
            ng_attribute=ng_attribute,
            reason=reason,
            severity=severity,
        )
        self.session.add(rule)
        await self.session.flush()
        await self.session.refresh(rule)
        return rule

    async def list_ng_rules(self) -> list[System12NgRule]:
        result = await self.session.execute(
            select(System12NgRule)
            .options(selectinload(System12NgRule.scene), selectinload(System12NgRule.recipient))
            .order_by(System12NgRule.id.asc())
        )
        return list(result.scalars().all())
