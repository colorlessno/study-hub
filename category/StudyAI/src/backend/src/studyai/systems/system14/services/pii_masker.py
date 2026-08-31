from __future__ import annotations

import re


class PIIMasker:
    EMAIL_PATTERN = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
    PHONE_PATTERN = re.compile(r"(?<!\d)(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})(?!\d)")
    MEMBER_PATTERN = re.compile(r"\b(?:USER|MEMBER|CUST|ID)-?[A-Z0-9]{3,}\b", re.IGNORECASE)
    POSTAL_PATTERN = re.compile(r"\b\d{3}-\d{4}\b")

    def mask(self, text: str) -> str:
        masked = self.EMAIL_PATTERN.sub("[masked-email]", text)
        masked = self.PHONE_PATTERN.sub("[masked-phone]", masked)
        masked = self.MEMBER_PATTERN.sub("[masked-member-id]", masked)
        masked = self.POSTAL_PATTERN.sub("[masked-postal-code]", masked)
        return masked

    def mask_metadata(self, metadata: dict) -> dict:
        masked: dict = {}
        sensitive_keys = {"name", "customer_name", "phone", "tel", "email", "address"}
        for key, value in metadata.items():
            if key.lower() in sensitive_keys:
                masked[key] = "[masked]"
            elif isinstance(value, str):
                masked[key] = self.mask(value)
            else:
                masked[key] = value
        return masked
