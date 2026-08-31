from __future__ import annotations

import hashlib
import re
from typing import Any


class PrivacyGuard:
    """候補者情報をDBへ保存する前に個人情報をマスクする。"""

    MASK = "***"
    SENSITIVE_KEYS = {
        "candidate_name",
        "full_name",
        "name",
        "email",
        "email_address",
        "phone",
        "phone_number",
        "address",
        "contact",
    }
    EMAIL_PATTERN = re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
    PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+?\d[\d() -]{7,}\d)(?!\d)")
    LABELED_VALUE_PATTERN = re.compile(
        r"(?im)^(?P<label>\s*(?:氏名|名前|住所|連絡先|name|address|contact)\s*[:：]\s*).+$"
    )

    def mask_candidate_data(self, value: Any, *, key: str | None = None) -> Any:
        if key is not None and key.casefold() in self.SENSITIVE_KEYS:
            return self.MASK
        if isinstance(value, dict):
            return {
                item_key: self.mask_candidate_data(item_value, key=str(item_key))
                for item_key, item_value in value.items()
            }
        if isinstance(value, list):
            return [self.mask_candidate_data(item) for item in value]
        if isinstance(value, tuple):
            return tuple(self.mask_candidate_data(item) for item in value)
        if isinstance(value, str):
            return self.mask_text(value)
        return value

    def mask_text(self, value: str) -> str:
        masked = self.EMAIL_PATTERN.sub(self.MASK, value)
        masked = self.PHONE_PATTERN.sub(self.MASK, masked)
        return self.LABELED_VALUE_PATTERN.sub(lambda match: f"{match.group('label')}{self.MASK}", masked)

    @staticmethod
    def anonymize_candidate_id(value: str | None) -> str | None:
        if value is None:
            return None
        digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]
        return f"candidate-{digest}"
