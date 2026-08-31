from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import AppError, ValidationAppError
from studyai.systems.system11.repositories.organizer_repository import ExecutionRepository, PlanRepository
from studyai.systems.system11.schemas.organizer import (
    ExecuteRequest,
    ExecuteResponse,
    ExecutionItemReport,
    ExecutionItemResult,
    ExecutionListItem,
    ExecutionListResponse,
    ExecutionReportResponse,
    RollbackResponse,
    SampleWorkspaceResponse,
    ScanRequest,
    ScanResponse,
    SettingsRequest,
    SettingsResponse,
)
from studyai.systems.system11.services.execution_service import ExecutionService
from studyai.systems.system11.services.path_safety_service import PathSafetyService
from studyai.systems.system11.services.plan_generator import PlanGenerator
from studyai.systems.system11.services.rollback_service import RollbackService
from studyai.systems.system11.services.sample_workspace_service import SampleWorkspaceService
from studyai.systems.system11.services.scan_service import ScanService
from studyai.systems.system11.services.settings_service import SettingsService


class OrganizerOrchestrator:
    def __init__(self) -> None:
        self.safety = PathSafetyService()
        self.scan_service = ScanService(self.safety)
        self.plan_generator = PlanGenerator()
        self.execution_service = ExecutionService(self.safety)
        self.rollback_service = RollbackService(self.safety)
        self.sample_workspace_service = SampleWorkspaceService()
        self.settings_service = SettingsService()

    def reset_sample_workspace(self) -> SampleWorkspaceResponse:
        return self.sample_workspace_service.reset()

    async def scan(self, session: AsyncSession, req: ScanRequest) -> ScanResponse:
        self.safety.validate_watch_folders(req.watch_folders)
        self.safety.validate_output_folder(req.output_folder)
        file_info_list = self.scan_service.collect_files(req.watch_folders, req.exclude_patterns)

        summary_text, actions, summary, planning_method = await self.plan_generator.generate_plan(
            file_info_list, req.output_folder
        )

        actions_json = [action.model_dump() for action in actions]
        repo = PlanRepository(session)
        plan = await repo.create_plan(
            summary=summary_text,
            actions_json=actions_json,
            watch_folders=req.watch_folders,
            output_folder=req.output_folder,
        )
        await session.commit()

        return ScanResponse(
            plan_id=plan.plan_id,
            scanned_files=len(file_info_list),
            actions=actions,
            summary=summary,
            planning_method=planning_method,
        )

    async def execute(self, session: AsyncSession, req: ExecuteRequest) -> ExecuteResponse:
        plan_repo = PlanRepository(session)
        plan = await plan_repo.get_plan(req.plan_id)

        approved_ids = set(req.approved_action_ids)
        target_actions = [
            action for action in plan.actions_json
            if str(action.get("action_id") or "") in approved_ids
        ]
        if not target_actions:
            raise ValidationAppError("no_valid_actions", "承認済みアクションが見つかりません。")

        # 重複 target_path チェック
        target_paths = [
            a.get("dest_path") or a.get("new_name")
            for a in target_actions
            if a.get("action_type") not in {"keep"}
        ]
        if len(target_paths) != len(set(str(p) for p in target_paths if p)):
            raise ValidationAppError("duplicate_target_path", "同一の移動先パスが複数指定されています。")

        allowed_roots = self.safety.validate_watch_folders(list(plan.watch_folders or []))
        if plan.output_folder:
            allowed_roots.append(self.safety.validate_output_folder(plan.output_folder))

        item_results = self.execution_service.execute_actions(target_actions, allowed_roots)

        success_items = [r for r in item_results if r["status"] == "success"]
        failed_items = [r for r in item_results if r["status"] not in {"success", "skipped_by_policy"}]
        success_count = len(success_items)
        failed_count = len(failed_items)

        if success_count == 0 and failed_count > 0:
            result_str = "failed"
        elif failed_count == 0:
            result_str = "success"
        else:
            result_str = "partial"

        rollback_data = [
            {
                "action_id": r["action_id"],
                "action_type": r["action_type"],
                "source_path": r["source_path"],
                "target_path": r["target_path"],
            }
            for r in item_results
            if r.get("rollbackable")
        ]

        exec_repo = ExecutionRepository(session)
        execution = await exec_repo.create_execution(
            plan_id=req.plan_id,
            result=result_str,
            rollback_data=rollback_data,
            success_count=success_count,
            failed_count=failed_count,
            item_results=item_results,
        )
        await plan_repo.update_status(req.plan_id, "executed")
        await session.commit()

        return ExecuteResponse(
            execution_id=execution.execution_id,
            plan_id=req.plan_id,
            result=result_str,
            success_count=success_count,
            failed_count=failed_count,
            item_results=[
                ExecutionItemResult(
                    action_id=str(r.get("action_id") or ""),
                    status=str(r.get("status") or ""),
                    error_code=r.get("error_code"),
                    executed_at=r.get("executed_at"),
                )
                for r in item_results
            ],
            rollback_available=bool(rollback_data),
        )

    async def rollback(self, session: AsyncSession, execution_id: str) -> RollbackResponse:
        exec_repo = ExecutionRepository(session)
        execution = await exec_repo.get_execution(execution_id)

        if execution.result == "rolled_back":
            raise AppError("already_rolled_back", "この実行はすでにロールバック済みです。", 409)

        rollback_items = [item for item in execution.rollback_data if item]
        if not rollback_items:
            raise AppError("no_rollback_data", "ロールバック対象のデータがありません。", 409)

        # 元 plan から監視元と整理先を引いてスコープを再構築する
        plan_repo = PlanRepository(session)
        plan = await plan_repo.get_plan(execution.plan_id)
        allowed_roots = self.safety.validate_watch_folders(list(plan.watch_folders or []))
        if plan.output_folder:
            allowed_roots.append(self.safety.validate_output_folder(plan.output_folder))

        results = self.rollback_service.rollback_items(rollback_items, allowed_roots)
        reverted = sum(1 for r in results if r["status"] == "reverted")
        failed = sum(1 for r in results if r["status"] != "reverted")

        # 全件成功時のみ rolled_back に更新。部分失敗時は DB ステータスを据え置く
        if failed == 0:
            await exec_repo.update_result(execution_id, "rolled_back")
        await session.commit()

        return RollbackResponse(
            execution_id=execution_id,
            rollback_result="success" if failed == 0 else "partial",
            reverted_count=reverted,
            failed_count=failed,
        )

    async def list_executions(self, session: AsyncSession) -> ExecutionListResponse:
        exec_repo = ExecutionRepository(session)
        executions = await exec_repo.list_executions()
        return ExecutionListResponse(
            total=len(executions),
            items=[
                ExecutionListItem(
                    execution_id=e.execution_id,
                    plan_id=e.plan_id,
                    result=e.result,
                    success_count=e.success_count,
                    failed_count=e.failed_count,
                    executed_at=e.executed_at,
                    rollback_available=bool(e.rollback_data) and e.result != "rolled_back",
                    rolled_back=e.result == "rolled_back",
                )
                for e in executions
            ],
        )

    async def get_report(self, session: AsyncSession, execution_id: str) -> ExecutionReportResponse:
        exec_repo = ExecutionRepository(session)
        execution = await exec_repo.get_execution(execution_id)
        return ExecutionReportResponse(
            execution_id=execution.execution_id,
            plan_id=execution.plan_id,
            result=execution.result,
            success_count=execution.success_count,
            failed_count=execution.failed_count,
            executed_at=execution.executed_at,
            items=[
                ExecutionItemReport(
                    action_type=item.action_type,
                    source_path=item.source_path,
                    target_path=item.target_path,
                    status=item.status,
                    error_code=item.error_code,
                    rollbackable=item.rollbackable,
                )
                for item in execution.items
            ],
        )

    async def save_settings(self, session: AsyncSession, req: SettingsRequest) -> SettingsResponse:
        self.safety.validate_watch_folders(req.watch_folders)
        if not req.output_folder:
            raise ValidationAppError("invalid_output_folder", "整理先フォルダを指定してください。")
        self.safety.validate_output_folder(req.output_folder)
        result = await self.settings_service.save_settings(session, req)
        await session.commit()
        return result
