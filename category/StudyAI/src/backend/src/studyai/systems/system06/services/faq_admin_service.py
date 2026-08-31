from __future__ import annotations

import csv
from io import StringIO

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ExternalServiceError, ValidationAppError
from studyai.systems.system06.repositories.faq_repository import FAQRepository
from studyai.systems.system06.schemas.support import FAQCreateRequest, FAQCreateResponse, FAQImportResponse


class FAQAdminService:
    def __init__(self) -> None:
        self.embedding_client = EmbeddingClient()
        self.audit_logger = get_audit_logger()

    async def create_faq(
        self,
        session: AsyncSession,
        *,
        body: FAQCreateRequest,
        trace_id: str,
        user_id: str | None,
    ) -> FAQCreateResponse:
        embedding = await self._safe_embed(f"{body.question}\n{body.answer}")
        faq = await FAQRepository(session).create_faq(
            faq_no=body.faq_no,
            title=body.title,
            question=body.question,
            answer=body.answer,
            category=body.category,
            embedding=embedding,
        )
        await session.commit()
        self.audit_logger.log(
            action="system06.faq.created",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system06_faq",
            resource_id=faq.id,
            details={"faq_no": body.faq_no, "category": body.category},
        )
        return FAQCreateResponse(
            faq_id=faq.id,
            faq_no=faq.faq_no,
            title=faq.title,
            category=faq.category,
        )

    async def import_faqs(
        self,
        session: AsyncSession,
        *,
        file_name: str | None,
        file_bytes: bytes,
        trace_id: str,
        user_id: str | None,
    ) -> FAQImportResponse:
        if not file_name or not file_name.lower().endswith(".csv"):
            raise ValidationAppError("invalid_faq_file", "Only CSV files are supported for FAQ import.")
        text = self._decode_csv(file_bytes)
        reader = csv.DictReader(StringIO(text))
        imported_count = 0
        failed_rows: list[dict] = []
        repo = FAQRepository(session)
        for index, row in enumerate(reader, start=2):
            question = (row.get("question") or "").strip()
            answer = (row.get("answer") or "").strip()
            title = (row.get("title") or question[:60]).strip()
            if not question or not answer:
                failed_rows.append({"row": index, "reason": "question and answer are required"})
                continue
            embedding = await self._safe_embed(f"{question}\n{answer}")
            await repo.create_faq(
                faq_no=(row.get("faq_no") or "").strip() or None,
                title=title or question[:60],
                question=question,
                answer=answer,
                category=(row.get("category") or "").strip() or None,
                embedding=embedding,
            )
            imported_count += 1
        await session.commit()
        self.audit_logger.log(
            action="system06.faq.imported",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system06_faq",
            resource_id=None,
            details={"imported_count": imported_count, "failed_count": len(failed_rows)},
        )
        return FAQImportResponse(imported_count=imported_count, failed_rows=failed_rows)

    async def _safe_embed(self, text: str) -> list[float] | None:
        try:
            return (await self.embedding_client.embed([text]))[0]
        except ExternalServiceError:
            return None

    @staticmethod
    def _decode_csv(file_bytes: bytes) -> str:
        for encoding in ("utf-8-sig", "utf-8", "cp932"):
            try:
                return file_bytes.decode(encoding)
            except UnicodeDecodeError:
                continue
        raise ValidationAppError("invalid_faq_encoding", "The FAQ import file encoding is not supported.")
