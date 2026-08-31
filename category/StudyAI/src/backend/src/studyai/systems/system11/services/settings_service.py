from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system11.models.organizer import OrganizerSettings
from studyai.systems.system11.schemas.organizer import SettingsRequest, SettingsResponse


class SettingsService:
    async def save_settings(self, session: AsyncSession, req: SettingsRequest) -> SettingsResponse:
        result = await session.execute(select(OrganizerSettings).order_by(OrganizerSettings.id.desc()).limit(1))
        row = result.scalar_one_or_none()
        if row is None:
            row = OrganizerSettings(
                watch_folders=req.watch_folders,
                output_folder=req.output_folder,
                exclude_patterns=req.exclude_patterns,
                mode=req.mode,
                schedule=req.schedule,
            )
            session.add(row)
        else:
            row.watch_folders = req.watch_folders
            row.output_folder = req.output_folder
            row.exclude_patterns = req.exclude_patterns
            row.mode = req.mode
            row.schedule = req.schedule
        await session.flush()
        await session.refresh(row)
        return SettingsResponse(
            id=row.id,
            watch_folders=list(row.watch_folders),
            output_folder=row.output_folder,
            exclude_patterns=list(row.exclude_patterns),
            mode=row.mode,
            schedule=row.schedule,
            updated_at=row.updated_at,
        )
