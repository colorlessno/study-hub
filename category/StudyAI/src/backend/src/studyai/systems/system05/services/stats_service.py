from __future__ import annotations

from collections import Counter
from datetime import date, datetime, time, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system05.models.medical import System05Appointment, System05Patient, System05TreatmentRecord
from studyai.systems.system05.schemas.medical import MonthlyStatsResponse


class StatsService:
    async def get_monthly_stats(self, session: AsyncSession, *, month: str) -> MonthlyStatsResponse:
        target_month = date.fromisoformat(f"{month}-01")
        month_start = datetime.combine(target_month, time.min)
        if target_month.month == 12:
            next_month = date(target_month.year + 1, 1, 1)
        else:
            next_month = date(target_month.year, target_month.month + 1, 1)
        month_end = datetime.combine(next_month, time.min)

        appointments = list(
            (
                await session.execute(
                    select(System05Appointment).where(
                        System05Appointment.start_time >= month_start,
                        System05Appointment.start_time < month_end,
                    )
                )
            ).scalars().all()
        )
        patients = list(
            (
                await session.execute(
                    select(System05Patient).where(
                        System05Patient.created_at >= month_start,
                        System05Patient.created_at < month_end,
                    )
                )
            ).scalars().all()
        )
        records = list(
            (
                await session.execute(
                    select(System05TreatmentRecord).where(
                        System05TreatmentRecord.session_date >= target_month,
                        System05TreatmentRecord.session_date < next_month,
                    )
                )
            ).scalars().all()
        )
        completed = [item for item in appointments if item.status == "completed"]
        cancelled = [item for item in appointments if item.status == "cancelled"]
        menu_counter = Counter(item.menu for item in completed)
        total_sales = sum(int(item.fee) for item in records)
        repeat_patients = 0
        patient_seen = Counter(item.patient_id for item in appointments if item.status == "completed")
        repeat_patients = sum(1 for count in patient_seen.values() if count >= 2)
        if patient_seen:
            repeat_rate = round(repeat_patients / len(patient_seen), 2)
        else:
            repeat_rate = 0.0
        return MonthlyStatsResponse(
            month=month,
            total_appointments=len(appointments),
            completed_appointments=len(completed),
            cancelled_appointments=len(cancelled),
            total_sales=total_sales,
            new_patients=len(patients),
            repeat_rate=repeat_rate,
            menu_ranking=[
                {"menu": menu, "count": count}
                for menu, count in menu_counter.most_common(5)
            ],
        )
