from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

# schedule 文字列 → APScheduler trigger のファクトリ
# インスタンスを使い回すと start_date 等の内部状態が汚染されるため毎回生成する
_SCHEDULE_TRIGGER_FACTORIES = {
    "daily": lambda: IntervalTrigger(days=1),
    "weekly": lambda: IntervalTrigger(weeks=1),
}

_JOB_ID = "system11_auto_organize"


class OrganizerScheduler:
    """APScheduler を使った定期実行管理。"""

    def __init__(self) -> None:
        self.scheduler = AsyncIOScheduler()
        self._callback = None  # 外部から注入する非同期コールバック

    def set_callback(self, callback) -> None:
        """定期実行時に呼び出す非同期コールバックを登録する。"""
        self._callback = callback

    def start(self) -> None:
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("OrganizerScheduler started.")

    def stop(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            logger.info("OrganizerScheduler stopped.")

    def apply_schedule(self, schedule: str | None) -> None:
        """
        schedule 文字列に従いジョブを登録・解除する。
        - "daily"  : 1日ごと
        - "weekly" : 1週間ごと
        - "manual" または None : ジョブ解除（手動のみ）
        """
        # 既存ジョブを除去
        if self.scheduler.get_job(_JOB_ID):
            self.scheduler.remove_job(_JOB_ID)

        if not schedule or schedule == "manual":
            logger.info("Auto-organize schedule cleared (manual only).")
            return

        factory = _SCHEDULE_TRIGGER_FACTORIES.get(schedule)
        if factory is None:
            logger.warning("Unknown schedule value '%s'. Job not registered.", schedule)
            return

        if self._callback is None:
            logger.warning("Scheduler callback not set. Job not registered.")
            return

        self.scheduler.add_job(
            self._callback,
            trigger=factory(),  # 毎回新しいインスタンスを生成
            id=_JOB_ID,
            replace_existing=True,
            misfire_grace_time=60,
        )
        logger.info("Auto-organize job registered: schedule=%s", schedule)

    def get_next_run(self) -> str | None:
        job = self.scheduler.get_job(_JOB_ID)
        if job and job.next_run_time:
            return job.next_run_time.isoformat()
        return None


# アプリケーション単位のシングルトン
_scheduler = OrganizerScheduler()


def get_organizer_scheduler() -> OrganizerScheduler:
    return _scheduler
