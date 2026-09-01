from __future__ import annotations

import os
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import AppError
from studyai.systems.system14.repositories.insight_repository import InsightRepository
from studyai.systems.system14.schemas.insight import (
    DeliveryConfigurationResponse,
    EmailSandboxMessage,
    EmailSandboxMessageListResponse,
    WebhookReceiptListResponse,
    WebhookReceiptResponse,
)


class DeliverySandboxService:
    def get_configuration(self) -> DeliveryConfigurationResponse:
        webhook_endpoint = self._environment("SYSTEM14_WEBHOOK_SINK_ENDPOINT")
        webhook_token = self._environment("SYSTEM14_WEBHOOK_BEARER_TOKEN")
        smtp_host = self._environment("SYSTEM14_SMTP_HOST")
        smtp_port = self._environment("SYSTEM14_SMTP_PORT") or "25"
        mailpit_api_url = self._environment("SYSTEM14_MAILPIT_API_URL")
        mail_inbox_url = self._environment("SYSTEM14_MAILPIT_PUBLIC_URL")
        dummy_crm_endpoint = self._environment("SYSTEM14_DUMMY_CRM_ENDPOINT")
        dummy_crm_token = self._environment("SYSTEM14_DUMMY_CRM_TOKEN")
        return DeliveryConfigurationResponse(
            webhook_configured=bool(webhook_endpoint and webhook_token),
            webhook_endpoint=webhook_endpoint,
            email_configured=bool(smtp_host and mailpit_api_url),
            smtp_destination=f"{smtp_host}:{smtp_port}" if smtp_host else None,
            mail_inbox_url=mail_inbox_url,
            dummy_crm_configured=bool(dummy_crm_endpoint and dummy_crm_token),
            actual_crm_configured=False,
        )

    async def receive_webhook(
        self,
        session: AsyncSession,
        *,
        payload: dict[str, Any],
    ) -> WebhookReceiptResponse:
        row = await InsightRepository(session).create_webhook_receipt(payload=payload)
        await session.commit()
        return WebhookReceiptResponse.model_validate(row)

    async def list_webhook_receipts(
        self,
        session: AsyncSession,
        *,
        limit: int,
    ) -> WebhookReceiptListResponse:
        rows = await InsightRepository(session).list_webhook_receipts(limit=limit)
        return WebhookReceiptListResponse(
            receipts=[WebhookReceiptResponse.model_validate(row) for row in rows]
        )

    async def list_email_messages(self, *, limit: int) -> EmailSandboxMessageListResponse:
        api_url = self._environment("SYSTEM14_MAILPIT_API_URL")
        if not api_url:
            raise AppError(
                "mail_sandbox_not_configured",
                "SYSTEM14_MAILPIT_API_URL is not configured.",
                503,
            )
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(api_url, params={"limit": limit})
        if response.status_code >= 400:
            raise AppError(
                "mail_sandbox_unavailable",
                f"Mail sandbox returned HTTP {response.status_code}.",
                502,
            )
        body = response.json()
        source_messages = body.get("messages", []) if isinstance(body, dict) else []
        messages: list[EmailSandboxMessage] = []
        for item in source_messages[:limit]:
            if isinstance(item, dict):
                messages.append(self._to_email_message(item))
        return EmailSandboxMessageListResponse(messages=messages)

    @staticmethod
    def _to_email_message(item: dict[str, Any]) -> EmailSandboxMessage:
        sender = item.get("From") or {}
        recipients = item.get("To") or []
        return EmailSandboxMessage(
            id=str(item.get("ID") or ""),
            subject=str(item.get("Subject") or ""),
            sender=str(sender.get("Address") or ""),
            recipients=[str(recipient.get("Address") or "") for recipient in recipients],
            created_at=str(item.get("Created") or ""),
            snippet=str(item.get("Snippet") or ""),
        )

    @staticmethod
    def _environment(name: str) -> str | None:
        value = os.environ.get(name, "").strip()
        return value or None
