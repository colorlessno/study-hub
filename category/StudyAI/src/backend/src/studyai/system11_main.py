from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import select

from studyai.app import create_base_app
from studyai.common.config.settings import get_settings
from studyai.common.db.session import SessionLocal
from studyai.systems.system11.api.router import router as system11_router
from studyai.systems.system11.models.organizer import OrganizerSettings
from studyai.systems.system11.schemas.organizer import ExecuteRequest, ScanRequest
from studyai.systems.system11.services.organizer_service import OrganizerOrchestrator
from studyai.systems.system11.services.scheduler_service import get_organizer_scheduler

logger = logging.getLogger(__name__)


async def _auto_organize_job() -> None:
    """スケジューラから呼び出される定期整理ジョブ。"""
    scheduler = get_organizer_scheduler()
    async with SessionLocal() as session:
        try:
            # 最新の settings を取得
            result = await session.execute(
                select(OrganizerSettings).order_by(OrganizerSettings.id.desc()).limit(1)
            )
            settings = result.scalar_one_or_none()
            if settings is None:
                logger.info("Auto-organize: no settings found, skipping.")
                return
            if not settings.watch_folders:
                logger.info("Auto-organize: watch_folders is empty, skipping.")
                return
            if settings.mode != "execute":
                logger.info("Auto-organize: mode=%s is not 'execute', skipping.", settings.mode)
                return

            output_folder = settings.output_folder or settings.watch_folders[0]
            req = ScanRequest(
                watch_folders=list(settings.watch_folders),
                output_folder=output_folder,
                exclude_patterns=list(settings.exclude_patterns or []),
                mode="execute",
            )
            orchestrator = OrganizerOrchestrator()
            scan_result = await orchestrator.scan(session, req)
            logger.info(
                "Auto-organize scan completed: plan_id=%s scanned=%d actions=%d",
                scan_result.plan_id,
                scan_result.scanned_files,
                len(scan_result.actions),
            )

            # confidence が閾値以上の move / rename / archive のみ自動実行
            approved_ids = [
                a.action_id
                for a in scan_result.actions
                if a.action_type in {"move", "rename", "archive"}
            ]
            if not approved_ids:
                logger.info("Auto-organize: no executable actions, skipping execute.")
                return

            exec_req = ExecuteRequest(
                plan_id=scan_result.plan_id,
                approved_action_ids=approved_ids,
                approval_mode="selective",
            )
            exec_result = await orchestrator.execute(session, exec_req)
            logger.info(
                "Auto-organize execute completed: execution_id=%s success=%d failed=%d",
                exec_result.execution_id,
                exec_result.success_count,
                exec_result.failed_count,
            )
        except Exception:
            logger.exception("Auto-organize job failed.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時: スケジューラ初期化
    scheduler = get_organizer_scheduler()
    scheduler.set_callback(_auto_organize_job)
    scheduler.start()

    # 保存済み schedule を読み込んで即時反映
    async with SessionLocal() as session:
        try:
            result = await session.execute(
                select(OrganizerSettings).order_by(OrganizerSettings.id.desc()).limit(1)
            )
            row = result.scalar_one_or_none()
            if row and row.schedule:
                scheduler.apply_schedule(row.schedule)
                logger.info("Auto-organize schedule restored: %s", row.schedule)
        except Exception:
            logger.warning("Failed to restore auto-organize schedule on startup.")

    yield

    # 停止時: スケジューラ終了
    scheduler.stop()


def create_system11_app() -> FastAPI:
    settings = get_settings()
    base = create_base_app()
    base.title = f"{settings.app_name} - System11"
    base.router.lifespan_context = lifespan
    base.include_router(system11_router, prefix=settings.api_prefix, tags=["system11"])
    return base


app = create_system11_app()
