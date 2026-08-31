from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_system_now(session: AsyncSession) -> datetime:
    """システム基準時刻を返す。

    clock_datetime が設定されている場合: その値をそのまま返す（日時フル固定）
    clock_date のみ設定されている場合: clock_date の日付 + OSローカルの現在時刻を返す（日付のみ固定）
    両方 NULL の場合: datetime.utcnow() を返す（実時刻）
    テーブルアクセスに失敗した場合: datetime.utcnow() にフォールバック
    """
    try:
        result = await session.execute(
            text("SELECT clock_date, clock_datetime FROM system_clock ORDER BY id LIMIT 1")
        )
        row = result.fetchone()
        if row:
            clock_date, clock_datetime = row[0], row[1]
            if clock_datetime is not None:
                # 日時フル固定
                return clock_datetime
            if clock_date is not None:
                # 日付のみ固定 + OSローカルの現在時刻
                now_local = datetime.now()
                return datetime(
                    clock_date.year,
                    clock_date.month,
                    clock_date.day,
                    now_local.hour,
                    now_local.minute,
                    now_local.second,
                    now_local.microsecond,
                )
    except Exception:
        pass
    return datetime.utcnow()


async def set_clock_date(session: AsyncSession, d: date, note: str = "") -> None:
    """日付のみ固定モードに設定する。clock_datetime は NULL にクリアする。"""
    await session.execute(
        text(
            "UPDATE system_clock "
            "SET clock_date = :d, clock_datetime = NULL, updated_at = NOW(), note = :note"
        ),
        {"d": d, "note": note},
    )


async def set_clock_datetime(session: AsyncSession, dt: datetime, note: str = "") -> None:
    """日時フル固定モードに設定する。clock_date は NULL にクリアする。"""
    await session.execute(
        text(
            "UPDATE system_clock "
            "SET clock_date = NULL, clock_datetime = :dt, updated_at = NOW(), note = :note"
        ),
        {"dt": dt, "note": note},
    )


async def reset_clock(session: AsyncSession) -> None:
    """両カラムを NULL にリセットし、実時刻モードに戻す。"""
    await session.execute(
        text(
            "UPDATE system_clock "
            "SET clock_date = NULL, clock_datetime = NULL, updated_at = NOW(), note = 'reset to realtime'"
        )
    )


async def get_clock_record(session: AsyncSession) -> dict:
    """system_clock の現在レコードと有効なシステム時刻を dict で返す。"""
    result = await session.execute(
        text("SELECT id, clock_date, clock_datetime, updated_at, note FROM system_clock ORDER BY id LIMIT 1")
    )
    row = result.fetchone()
    if not row:
        return {
            "mode": "realtime",
            "clock_date": None,
            "clock_datetime": None,
            "effective_datetime": datetime.utcnow().isoformat(),
            "updated_at": None,
            "note": None,
        }

    clock_date, clock_datetime = row[1], row[2]

    if clock_datetime is not None:
        mode = "fixed_datetime"
        effective = clock_datetime
    elif clock_date is not None:
        mode = "fixed_date"
        now_local = datetime.now()
        effective = datetime(
            clock_date.year, clock_date.month, clock_date.day,
            now_local.hour, now_local.minute, now_local.second,
        )
    else:
        mode = "realtime"
        effective = datetime.utcnow()

    return {
        "id": row[0],
        "mode": mode,
        "clock_date": clock_date.isoformat() if clock_date else None,
        "clock_datetime": clock_datetime.isoformat() if clock_datetime else None,
        "effective_datetime": effective.isoformat(),
        "updated_at": row[3].isoformat() if row[3] else None,
        "note": row[4],
    }
