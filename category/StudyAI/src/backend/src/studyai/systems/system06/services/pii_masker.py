from __future__ import annotations

import re


class PIIMasker:
    EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
    ORDER_PATTERN = re.compile(r"\b[A-Z]{2,10}-\d{2,}(?:-\d+)?\b")
    MEMBER_PATTERN = re.compile(r"\b(?:USER|MEMBER|CUST|ID)-?[A-Z0-9]{3,}\b", re.IGNORECASE)

    def mask(self, text: str, *, order_id: str | None = None, member_id: str | None = None) -> str:
        masked = self.EMAIL_PATTERN.sub("[masked-email]", text)
        masked = self.ORDER_PATTERN.sub("[masked-order-id]", masked)
        masked = self.MEMBER_PATTERN.sub("[masked-member-id]", masked)
        if order_id:
            masked = masked.replace(order_id, "[masked-order-id]")
        if member_id:
            masked = masked.replace(member_id, "[masked-member-id]")
        return masked
