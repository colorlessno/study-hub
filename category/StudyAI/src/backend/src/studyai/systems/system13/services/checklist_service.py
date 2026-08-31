from __future__ import annotations

from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system13.repositories.checklist_repository import ChecklistRepository
from studyai.systems.system13.repositories.member_repository import MemberRepository
from studyai.systems.system13.repositories.project_repository import ProjectRepository
from studyai.systems.system13.schemas.education import (
    ChecklistItemResponse,
    ChecklistResponse,
    ChecklistUpdateResponse,
)


class ChecklistService:
    VALID_STATUS = {"pending", "in_progress", "completed"}
    ROLE_TEMPLATES = {
        "developer": [
            ("プロジェクト概要と設計文書を確認する", "文書", 1),
            ("ローカル開発環境を準備する", "環境", 2),
            ("コーディング規約とCIの流れを確認する", "進め方", 3),
            ("既知の注意点と変更時の危険箇所を確認する", "リスク", 4),
        ],
        "tester": [
            ("テスト方針と品質基準を確認する", "文書", 1),
            ("テスト環境と利用アカウントを確認する", "環境", 2),
            ("最近の障害と既知のリスクを確認する", "リスク", 3),
            ("支援を受けながら基本動作を一度確認する", "進め方", 4),
        ],
        "pm": [
            ("プロジェクト概要と直近の節目を確認する", "文書", 1),
            ("未解決課題と納期リスクを確認する", "リスク", 2),
            ("主要な連絡先と意思決定者を確認する", "関係者", 3),
            ("報告方法と週次の進行手順を確認する", "進め方", 4),
        ],
        "member": [
            ("プロジェクト概要を確認する", "文書", 1),
            ("主要な連絡先を確認する", "関係者", 2),
            ("既知の注意点を確認する", "リスク", 3),
        ],
    }

    def __init__(self) -> None:
        self.audit_logger = get_audit_logger()

    async def get_checklist(
        self,
        session,
        *,
        project_id: str,
        user_id: str,
        fallback_role: str | None = None,
    ) -> ChecklistResponse:
        await ProjectRepository(session).get(project_id)
        member_repo = MemberRepository(session)
        member = await member_repo.get_or_create(
            project_id=project_id,
            user_id=user_id,
            role=fallback_role or "member",
        )
        repository = ChecklistRepository(session)
        items = await repository.list_items(project_id=project_id, user_id=user_id)
        if not items:
            defaults = self.build_default_items(
                project_id=project_id,
                user_id=user_id,
                role=member.role or fallback_role or "member",
            )
            await repository.bulk_create(defaults)
            await session.commit()
            items = await repository.list_items(project_id=project_id, user_id=user_id)

        completed_count = sum(1 for item in items if item.status == "completed")
        return ChecklistResponse(
            project_id=project_id,
            user_id=user_id,
            role=member.role or fallback_role or "member",
            total_count=len(items),
            completed_count=completed_count,
            items=[
                ChecklistItemResponse(
                    item_id=item.id,
                    title=item.title,
                    category=item.category,
                    status=item.status,
                    due_days=item.due_days,
                )
                for item in items
            ],
        )

    async def update_item(
        self,
        session,
        *,
        project_id: str,
        user_id: str,
        item_id: int,
        status: str,
        actor: str | None,
        trace_id: str | None = None,
    ) -> ChecklistUpdateResponse:
        if status not in self.VALID_STATUS:
            raise ValidationAppError(
                "invalid_checklist_status",
                "status must be pending, in_progress, or completed.",
            )
        item = await ChecklistRepository(session).update_status(
            project_id=project_id,
            user_id=user_id,
            item_id=item_id,
            status=status,
        )
        await session.commit()
        self.audit_logger.log(
            action="system13.update_checklist_status",
            actor=actor,
            target_type="checklist_item",
            target_id=str(item.id),
            trace_id=trace_id,
            metadata={"project_id": project_id, "status": status},
        )
        return ChecklistUpdateResponse(
            project_id=project_id,
            user_id=user_id,
            item_id=item.id,
            status=item.status,
        )

    @classmethod
    def build_default_items(cls, *, project_id: str, user_id: str, role: str) -> list[dict[str, object]]:
        normalized_role = role.strip().lower() if role else "member"
        templates = cls.ROLE_TEMPLATES.get(normalized_role, cls.ROLE_TEMPLATES["member"])
        return [
            {
                "project_id": project_id,
                "user_id": user_id,
                "role": normalized_role,
                "title": title,
                "category": category,
                "status": "pending",
                "due_days": due_days,
            }
            for title, category, due_days in templates
        ]
