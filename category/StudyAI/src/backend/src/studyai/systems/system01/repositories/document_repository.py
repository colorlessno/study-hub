from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system01.models.document import Document, DocumentItem
from studyai.systems.system01.schemas.extract import CorrectionRequest, ExtractResultPayload


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_hash(self, file_hash: str) -> Document | None:
        result = await self.session.execute(select(Document).where(Document.file_hash == file_hash))
        return result.scalar_one_or_none()

    async def get_by_id(self, document_id: int) -> Document:
        result = await self.session.execute(select(Document).where(Document.id == document_id))
        document = result.scalar_one_or_none()
        if document is None:
            raise NotFoundAppError("document_not_found", "対象の文書が存在しません。")
        return document

    async def create_document(self, file_name: str, file_hash: str, payload: ExtractResultPayload, confidence_score, requires_review: bool, missing_fields: list[str]) -> Document:
        document = Document(
            file_name=file_name,
            file_hash=file_hash,
            document_type=payload.document_type,
            issue_date=payload.issue_date,
            supplier_name=payload.supplier_name,
            supplier_address=payload.supplier_address,
            recipient_name=payload.recipient_name,
            subtotal=payload.subtotal,
            tax_8=payload.tax_8,
            tax_10=payload.tax_10,
            total=payload.total,
            payment_due=payload.payment_due,
            bank_info=payload.bank_info.model_dump() if payload.bank_info else None,
            invoice_number=payload.invoice_number,
            confidence_score=confidence_score,
            requires_review=requires_review,
            review_status="未確認",
            business_duplicate_suspected=False,
            missing_fields=missing_fields,
        )
        document.items = [
            DocumentItem(name=item.name, quantity=item.quantity, unit_price=item.unit_price, amount=item.amount)
            for item in payload.items
        ]
        self.session.add(document)
        await self.session.flush()
        await self.session.refresh(document)
        return document

    async def correct_document(self, document_id: int, payload: CorrectionRequest, confidence_score, requires_review: bool, missing_fields: list[str]) -> Document:
        document = await self.get_by_id(document_id)
        update_data = payload.model_dump(exclude_none=True, exclude={"items", "bank_info", "corrected_fields"})
        for field_name, value in update_data.items():
            setattr(document, field_name, value)
        if payload.bank_info is not None:
            document.bank_info = payload.bank_info.model_dump()
        if payload.items is not None:
            await self.session.execute(delete(DocumentItem).where(DocumentItem.document_id == document_id))
            document.items = [
                DocumentItem(
                    document_id=document_id,
                    name=item.name,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    amount=item.amount,
                )
                for item in payload.items
            ]
        document.confidence_score = confidence_score
        document.requires_review = requires_review
        document.missing_fields = missing_fields
        await self.session.flush()
        await self.session.refresh(document)
        return document

    async def list_documents(self, *, date_from=None, date_to=None, supplier=None, min_amount=None, max_amount=None, document_type=None, requires_review=None, review_status=None, page: int = 1, per_page: int = 20) -> tuple[int, list[Document]]:
        stmt = select(Document)
        count_stmt = select(func.count()).select_from(Document)
        filters = []
        if date_from is not None:
            filters.append(Document.issue_date >= date_from)
        if date_to is not None:
            filters.append(Document.issue_date <= date_to)
        if supplier:
            filters.append(Document.supplier_name.ilike(f"%{supplier}%"))
        if min_amount is not None:
            filters.append(Document.total >= min_amount)
        if max_amount is not None:
            filters.append(Document.total <= max_amount)
        if document_type:
            filters.append(Document.document_type == document_type)
        if requires_review is not None:
            filters.append(Document.requires_review == requires_review)
        if review_status is not None:
            filters.append(Document.review_status == review_status)
        for condition in filters:
            stmt = stmt.where(condition)
            count_stmt = count_stmt.where(condition)
        stmt = stmt.order_by(Document.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
        total = (await self.session.execute(count_stmt)).scalar_one()
        items = (await self.session.execute(stmt)).scalars().all()
        return total, list(items)
