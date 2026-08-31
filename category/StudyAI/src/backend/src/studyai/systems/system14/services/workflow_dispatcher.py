from __future__ import annotations

import os
import smtplib
from datetime import date, datetime
from email.message import EmailMessage
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system14.models.insight import System14Workflow
from studyai.systems.system14.repositories.insight_repository import InsightRepository
from studyai.systems.system14.schemas.insight import (
    WorkflowCreateRequest,
    WorkflowCreateResponse,
    WorkflowDeliveryResult,
)
from studyai.systems.system14.services.insight_query_service import InsightQueryService


class WorkflowDispatcher:
    async def create_workflow(self, session: AsyncSession, *, body: WorkflowCreateRequest) -> WorkflowCreateResponse:
        repo = InsightRepository(session)
        workflow = await repo.create_workflow(body=body)
        delivery_result = await self._dispatch(session, repo, workflow)
        await session.commit()
        return WorkflowCreateResponse(
            workflow_id=workflow.id,
            name=workflow.name,
            trigger=workflow.trigger,
            output_type=workflow.output_type,
            delivery=workflow.delivery,
            is_active=workflow.is_active,
            created_at=workflow.created_at,
            delivery_result=delivery_result,
        )

    async def _dispatch(
        self,
        session: AsyncSession,
        repo: InsightRepository,
        workflow: System14Workflow,
    ) -> WorkflowDeliveryResult:
        delivery = workflow.delivery or {}
        method = str(delivery.get("method") or "dashboard")
        destination = self._destination(delivery)
        payload = await self._build_payload(session, workflow)
        delivered_at = datetime.utcnow()

        try:
            status, response, error_message = await self._deliver(method, delivery, payload)
        except Exception as exc:  # noqa: BLE001 - delivery failures must be logged instead of aborting workflow creation.
            status = "failed"
            response = {}
            error_message = str(exc)

        log = await repo.create_workflow_delivery_log(
            workflow_id=workflow.id,
            method=method,
            destination=destination,
            status=status,
            payload=payload,
            response=response,
            error_message=error_message,
            delivered_at=delivered_at,
        )
        return WorkflowDeliveryResult(
            log_id=log.id,
            method=log.method,
            destination=log.destination,
            status=log.status,
            payload=log.payload,
            response=log.response_json,
            error_message=log.error_message,
            delivered_at=log.delivered_at,
        )

    async def _build_payload(self, session: AsyncSession, workflow: System14Workflow) -> dict[str, Any]:
        service = InsightQueryService()
        filters = workflow.filters or {}
        normalized = self._normalize_filters(filters)
        output_type = workflow.output_type or "dashboard"

        if output_type == "sales_score":
            data = await service.get_sales_score(
                session,
                from_date=normalized["from_date"],
                to_date=normalized["to_date"],
                staff_id=normalized["staff_id"],
            )
        elif output_type == "win_loss":
            data = await service.get_win_loss(
                session,
                from_date=normalized["from_date"],
                to_date=normalized["to_date"],
                limit=10,
            )
        elif output_type == "action_proposals":
            data = await service.get_action_proposals(
                session,
                product=normalized["product"],
                priority=None,
                from_date=normalized["from_date"],
                to_date=normalized["to_date"],
            )
        elif output_type == "faq_gaps":
            data = await service.get_faq_gaps(
                session,
                product=normalized["product"],
                limit=10,
            )
        elif output_type == "dashboard":
            data = await service.get_dashboard(session)
        else:
            data = await service.get_voice_ranking(
                session,
                from_date=normalized["from_date"],
                to_date=normalized["to_date"],
                product=normalized["product"],
                call_reason=normalized["call_reason"],
                sentiment=normalized["sentiment"],
                utterance_type=normalized["utterance_type"],
                limit=10,
            )

        return {
            "workflow": {
                "id": workflow.id,
                "name": workflow.name,
                "trigger": workflow.trigger,
                "output_type": output_type,
                "data_sources": workflow.data_sources,
                "analysis_steps": workflow.analysis_steps,
            },
            "filters": filters,
            "generated_at": datetime.utcnow().isoformat(timespec="seconds"),
            "output": {
                "type": output_type,
                "data": data.model_dump(mode="json"),
            },
        }

    async def _deliver(
        self,
        method: str,
        delivery: dict[str, Any],
        payload: dict[str, Any],
    ) -> tuple[str, dict[str, Any], str | None]:
        if method == "dashboard":
            return (
                "success",
                {"message": "stored_for_dashboard", "log_table": "system14_workflow_delivery_logs"},
                None,
            )
        if method == "webhook":
            return await self._deliver_webhook(delivery, payload)
        if method == "email":
            return await self._deliver_email(delivery, payload)
        if method == "crm":
            return (
                "failed",
                {"message": "crm_delivery_not_configured"},
                "CRM delivery is not implemented. Configure a CRM connector before enabling this method.",
            )
        return ("failed", {}, f"Unsupported delivery method: {method}")

    async def _deliver_webhook(
        self,
        delivery: dict[str, Any],
        payload: dict[str, Any],
    ) -> tuple[str, dict[str, Any], str | None]:
        endpoint = str(delivery.get("endpoint") or "").strip()
        if not endpoint:
            return ("failed", {}, "Webhook delivery requires endpoint.")
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(endpoint, json=payload)
        response_payload = {
            "status_code": response.status_code,
            "body": response.text[:1000],
        }
        if response.status_code >= 400:
            return ("failed", response_payload, f"Webhook returned HTTP {response.status_code}.")
        return ("success", response_payload, None)

    async def _deliver_email(
        self,
        delivery: dict[str, Any],
        payload: dict[str, Any],
    ) -> tuple[str, dict[str, Any], str | None]:
        host = os.environ.get("SYSTEM14_SMTP_HOST")
        recipients = [str(item) for item in delivery.get("recipients", []) if str(item).strip()]
        if not host:
            return (
                "skipped",
                {"message": "smtp_not_configured"},
                "SYSTEM14_SMTP_HOST is not configured.",
            )
        if not recipients:
            return ("failed", {}, "Email delivery requires recipients.")

        self._send_email(host, recipients, payload)
        return (
            "success",
            {"message": "email_sent", "recipient_count": len(recipients)},
            None,
        )

    @staticmethod
    def _send_email(host: str, recipients: list[str], payload: dict[str, Any]) -> None:
        port = int(os.environ.get("SYSTEM14_SMTP_PORT", "25"))
        sender = os.environ.get("SYSTEM14_SMTP_FROM", "system14@studyai.local")
        username = os.environ.get("SYSTEM14_SMTP_USERNAME")
        password = os.environ.get("SYSTEM14_SMTP_PASSWORD")
        use_tls = os.environ.get("SYSTEM14_SMTP_TLS", "").lower() in {"1", "true", "yes", "on"}

        message = EmailMessage()
        message["Subject"] = f"System14 workflow: {payload['workflow']['name']}"
        message["From"] = sender
        message["To"] = ", ".join(recipients)
        message.set_content(str(payload))

        with smtplib.SMTP(host=host, port=port, timeout=10) as smtp:
            if use_tls:
                smtp.starttls()
            if username and password:
                smtp.login(username, password)
            smtp.send_message(message)

    @staticmethod
    def _destination(delivery: dict[str, Any]) -> str | None:
        method = str(delivery.get("method") or "dashboard")
        if method in {"webhook", "crm"}:
            return delivery.get("endpoint")
        if method == "email":
            recipients = delivery.get("recipients") or []
            return ",".join(str(item) for item in recipients)
        return "dashboard"

    @staticmethod
    def _normalize_filters(filters: dict[str, Any]) -> dict[str, Any]:
        return {
            "from_date": WorkflowDispatcher._parse_date(filters.get("from_date") or filters.get("fromDate")),
            "to_date": WorkflowDispatcher._parse_date(filters.get("to_date") or filters.get("toDate")),
            "product": WorkflowDispatcher._clean(filters.get("product")),
            "call_reason": WorkflowDispatcher._clean(filters.get("call_reason") or filters.get("callReason")),
            "sentiment": WorkflowDispatcher._clean(filters.get("sentiment")),
            "staff_id": WorkflowDispatcher._clean(filters.get("staff_id") or filters.get("staffId")),
            "utterance_type": WorkflowDispatcher._clean(filters.get("type") or filters.get("utterance_type")),
        }

    @staticmethod
    def _parse_date(value: Any) -> date | None:
        if isinstance(value, date):
            return value
        if value in (None, ""):
            return None
        try:
            return date.fromisoformat(str(value))
        except ValueError:
            return None

    @staticmethod
    def _clean(value: Any) -> str | None:
        if value in (None, ""):
            return None
        text = str(value).strip()
        return text or None
