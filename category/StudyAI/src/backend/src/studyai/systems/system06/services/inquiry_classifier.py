from __future__ import annotations

from dataclasses import dataclass

from studyai.common.ai.llm_client import LLMClient
from studyai.common.errors.models import ExternalServiceError, ValidationAppError
from studyai.systems.system06.prompts.support_prompt import CLASSIFICATION_SYSTEM_PROMPT


@dataclass(slots=True)
class ClassifiedInquiry:
    category: str
    priority: str
    confidence: str


class InquiryClassifier:
    CATEGORY_RULES = {
        "注文・購入": ["注文", "購入", "在庫", "買い方", "カート"],
        "配送・納期": ["配送", "届か", "納期", "発送", "追跡", "配達", "いつ届"],
        "キャンセル・変更": ["キャンセル", "変更", "修正", "取り消し"],
        "返品・交換": ["返品", "交換", "返送"],
        "返金": ["返金", "払い戻し", "返金され", "返金状況"],
        "不具合・品質": ["壊れ", "不具合", "品質", "初期不良", "故障", "破損", "エラー"],
        "アカウント": ["ログイン", "パスワード", "会員", "アカウント", "認証"],
        "請求・支払い": ["請求", "支払い", "決済", "領収書", "カード", "引き落とし"],
    }
    URGENT_KEYWORDS = ["個人情報", "漏洩", "法的", "訴訟", "決済トラブル", "不正利用"]
    HIGH_KEYWORDS = ["クレーム", "返金", "至急", "今日中", "担当者", "返品", "交換", "怒"]
    LOW_KEYWORDS = ["参考まで", "念のため", "確認だけ", "急ぎではない"]
    VALID_CATEGORIES = set(CATEGORY_RULES) | {"その他"}
    VALID_PRIORITIES = {"緊急", "高", "中", "低"}
    VALID_CONFIDENCE = {"高", "中", "低"}

    def __init__(self) -> None:
        self.llm_client = LLMClient()

    async def classify(self, message: str, *, context_note: str | None = None) -> ClassifiedInquiry:
        heuristic = self._heuristic_classify(message)
        if heuristic.confidence == "高":
            return heuristic

        prompt = self._build_prompt(message, context_note=context_note)
        try:
            llm_result = await self.llm_client.extract_json(CLASSIFICATION_SYSTEM_PROMPT, prompt)
        except ExternalServiceError:
            return heuristic

        normalized = self._normalize_llm_result(llm_result)
        if normalized is None:
            return heuristic
        return normalized

    def _build_prompt(self, message: str, *, context_note: str | None) -> str:
        lines = [f"inquiry: {message}"]
        if context_note:
            lines.append(f"context: {context_note}")
        return "\n".join(lines)

    def _heuristic_classify(self, message: str) -> ClassifiedInquiry:
        category = "その他"
        matched_count = 0
        for candidate, keywords in self.CATEGORY_RULES.items():
            current_matches = sum(1 for keyword in keywords if keyword in message)
            if current_matches > matched_count:
                matched_count = current_matches
                category = candidate

        if any(keyword in message for keyword in self.URGENT_KEYWORDS):
            priority = "緊急"
        elif any(keyword in message for keyword in self.HIGH_KEYWORDS):
            priority = "高"
        elif any(keyword in message for keyword in self.LOW_KEYWORDS):
            priority = "低"
        else:
            priority = "中"

        if priority == "緊急" or matched_count >= 2:
            confidence = "高"
        elif matched_count == 1:
            confidence = "中"
        else:
            confidence = "低"

        return ClassifiedInquiry(category=category, priority=priority, confidence=confidence)

    def _normalize_llm_result(self, payload: dict) -> ClassifiedInquiry | None:
        category = str(payload.get("category", "")).strip()
        priority = str(payload.get("priority", "")).strip()
        confidence = str(payload.get("confidence", "")).strip()
        if category not in self.VALID_CATEGORIES:
            return None
        if priority not in self.VALID_PRIORITIES:
            return None
        if confidence not in self.VALID_CONFIDENCE:
            return None
        return ClassifiedInquiry(category=category, priority=priority, confidence=confidence)

    def validate_channel(self, channel: str) -> None:
        if channel not in {"mail", "chat", "form"}:
            raise ValidationAppError("invalid_channel", "channel must be mail, chat, or form.")
