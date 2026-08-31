from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.clock.clock import (
    get_clock_record,
    reset_clock,
    set_clock_date,
    set_clock_datetime,
)
from studyai.common.db.session import get_db_session

router = APIRouter(prefix="/system-clock", tags=["system-clock"])


class ClockDateRequest(BaseModel):
    clock_date: date
    note: str = ""


class ClockDatetimeRequest(BaseModel):
    clock_datetime: datetime
    note: str = ""


class ClockResponse(BaseModel):
    id: int | None = None
    mode: str  # "realtime" / "fixed_date" / "fixed_datetime"
    clock_date: str | None = None
    clock_datetime: str | None = None
    effective_datetime: str
    updated_at: str | None = None
    note: str | None = None


@router.get("", response_model=ClockResponse)
async def get_clock(session: AsyncSession = Depends(get_db_session)) -> ClockResponse:
    """現在のシステム基準時刻設定と有効な時刻を取得する。

    - mode=realtime: 実時刻を使用中
    - mode=fixed_date: 日付のみ固定（時刻はOSローカル）
    - mode=fixed_datetime: 日時フル固定
    """
    record = await get_clock_record(session)
    return ClockResponse(**record)


@router.put("/date", response_model=ClockResponse)
async def set_date(
    body: ClockDateRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ClockResponse:
    """日付のみ固定モードに設定する。

    時刻部分はOSローカルの現在時刻が使われる。
    日次バッチのテストで「翌日扱い」にしたい場合に使用。
    """
    await set_clock_date(session, body.clock_date, note=body.note)
    await session.commit()
    record = await get_clock_record(session)
    return ClockResponse(**record)


@router.put("/datetime", response_model=ClockResponse)
async def set_datetime(
    body: ClockDatetimeRequest,
    session: AsyncSession = Depends(get_db_session),
) -> ClockResponse:
    """日時フル固定モードに設定する。

    定刻起動テスト等、特定の日時を完全に固定したい場合に使用。
    """
    await set_clock_datetime(session, body.clock_datetime, note=body.note)
    await session.commit()
    record = await get_clock_record(session)
    return ClockResponse(**record)


@router.delete("", response_model=ClockResponse)
async def reset(session: AsyncSession = Depends(get_db_session)) -> ClockResponse:
    """システム基準時刻をリセットし、実時刻モードに戻す。"""
    await reset_clock(session)
    await session.commit()
    record = await get_clock_record(session)
    return ClockResponse(**record)
