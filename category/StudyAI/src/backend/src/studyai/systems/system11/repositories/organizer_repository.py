from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system11.models.organizer import Execution, ExecutionItem, Plan


class PlanRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_plan(
        self,
        summary: str,
        actions_json: list,
        watch_folders: list,
        output_folder: str,
    ) -> Plan:
        plan = Plan(
            plan_id=f"plan_{uuid.uuid4().hex[:12]}",
            summary=summary,
            actions_json=actions_json,
            watch_folders=watch_folders,
            output_folder=output_folder,
            status="created",
        )
        self.session.add(plan)
        await self.session.flush()
        return plan

    async def get_plan(self, plan_id: str) -> Plan:
        result = await self.session.execute(select(Plan).where(Plan.plan_id == plan_id))
        plan = result.scalar_one_or_none()
        if plan is None:
            raise NotFoundAppError("plan_not_found", "整理案が見つかりません。", {"plan_id": plan_id})
        return plan

    async def update_status(self, plan_id: str, status: str) -> Plan:
        plan = await self.get_plan(plan_id)
        plan.status = status
        await self.session.flush()
        return plan


class ExecutionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_execution(
        self,
        plan_id: str,
        result: str,
        rollback_data: list,
        success_count: int,
        failed_count: int,
        item_results: list[dict],
    ) -> Execution:
        execution = Execution(
            execution_id=f"exec_{uuid.uuid4().hex[:12]}",
            plan_id=plan_id,
            result=result,
            rollback_data=rollback_data,
            success_count=success_count,
            failed_count=failed_count,
        )
        self.session.add(execution)
        await self.session.flush()

        for item in item_results:
            ei = ExecutionItem(
                execution_id=execution.execution_id,
                action_type=str(item.get("action_type") or ""),
                source_path=str(item.get("source_path") or ""),
                target_path=item.get("target_path"),
                status=str(item.get("status") or "failed"),
                error_code=item.get("error_code"),
                rollbackable=bool(item.get("rollbackable", False)),
            )
            self.session.add(ei)
        await self.session.flush()
        return execution

    async def get_execution(self, execution_id: str) -> Execution:
        result = await self.session.execute(
            select(Execution).where(Execution.execution_id == execution_id)
        )
        execution = result.scalar_one_or_none()
        if execution is None:
            raise NotFoundAppError("execution_not_found", "実行履歴が見つかりません。", {"execution_id": execution_id})
        return execution

    async def list_executions(self) -> list[Execution]:
        result = await self.session.execute(
            select(Execution).order_by(Execution.executed_at.desc()).limit(100)
        )
        return list(result.scalars().all())

    async def update_result(self, execution_id: str, result: str) -> Execution:
        execution = await self.get_execution(execution_id)
        execution.result = result
        await self.session.flush()
        return execution
