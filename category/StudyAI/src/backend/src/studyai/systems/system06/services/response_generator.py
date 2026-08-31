from __future__ import annotations

from studyai.common.ai.llm_client import LLMClient
from studyai.common.errors.models import ExternalServiceError
from studyai.systems.system06.prompts.support_prompt import RESPONSE_SYSTEM_PROMPT
from studyai.systems.system06.services.faq_retriever import RetrievedFAQ
from studyai.systems.system06.services.inquiry_classifier import ClassifiedInquiry


class ResponseGenerator:
    def __init__(self) -> None:
        self.llm_client = LLMClient()

    async def generate(
        self,
        *,
        message: str,
        classification: ClassifiedInquiry,
        faq_hits: list[RetrievedFAQ],
        history: list[dict],
    ) -> dict:
        if not faq_hits:
            return self._fallback_without_faq(classification)

        prompt = self._build_prompt(message=message, classification=classification, faq_hits=faq_hits, history=history)
        try:
            payload = await self.llm_client.extract_json(RESPONSE_SYSTEM_PROMPT, prompt)
        except ExternalServiceError:
            payload = {}

        generated_message = str(payload.get("message", "")).strip()
        generated_actions = payload.get("next_actions")
        next_actions = (
            [str(item).strip() for item in generated_actions if str(item).strip()]
            if isinstance(generated_actions, list)
            else []
        )
        best = faq_hits[0]
        if not generated_message:
            generated_message = self._fallback_message(best)
        if not next_actions:
            next_actions = ["案内されたFAQの手順を確認し、該当操作をお試しください。"]
        return {
            "type": "auto",
            "message": generated_message,
            "sources": [self._faq_label(hit) for hit in faq_hits[:3]],
            "next_actions": next_actions[:3],
            "is_resolved_question": "この回答でご不明点は解決しましたか？",
        }

    def _build_prompt(
        self,
        *,
        message: str,
        classification: ClassifiedInquiry,
        faq_hits: list[RetrievedFAQ],
        history: list[dict],
    ) -> str:
        faq_text = "\n".join(
            f"- {self._faq_label(hit)}\n  question: {hit.faq.question}\n  answer: {hit.faq.answer}"
            for hit in faq_hits[:3]
        )
        history_text = "\n".join(
            f"- user: {item.get('user', '')}\n  assistant: {item.get('assistant', '')}" for item in history[-3:]
        )
        return (
            f"classification: {classification.category} / {classification.priority} / {classification.confidence}\n"
            f"inquiry: {message}\n"
            f"history:\n{history_text or '- none'}\n"
            f"faqs:\n{faq_text}"
        )

    def _fallback_without_faq(self, classification: ClassifiedInquiry) -> dict:
        return {
            "type": "review",
            "message": (
                f"お問い合わせ内容を確認しました。現在の判定カテゴリは「{classification.category}」です。"
                "関連FAQだけでは断定回答できないため、内容を確認のうえ対応いたします。"
            ),
            "sources": [],
            "next_actions": ["担当者からの案内をお待ちください。"],
            "is_resolved_question": None,
        }

    def _fallback_message(self, hit: RetrievedFAQ) -> str:
        answer = hit.faq.answer.strip()
        if len(answer) <= 220:
            return answer
        return answer[:217].rstrip() + "..."

    @staticmethod
    def _faq_label(hit: RetrievedFAQ) -> str:
        prefix = f"{hit.faq.faq_no}: " if hit.faq.faq_no else ""
        return f"{prefix}{hit.faq.title}"
