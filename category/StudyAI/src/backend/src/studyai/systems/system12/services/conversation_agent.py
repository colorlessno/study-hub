from __future__ import annotations

import asyncio
import re

from studyai.common.ai.llm_client import LLMClient
from studyai.systems.system12.prompts.gift_prompt import CONVERSATION_PROMPT


class ConversationAgent:
    REQUIRED_CONDITIONS = ("scene", "recipient", "budget")
    SCENE_KEYWORDS = {
        "誕生日": "誕生日",
        "母の日": "母の日",
        "父の日": "父の日",
        "結婚祝い": "結婚祝い",
        "出産祝い": "出産祝い",
        "退職": "退職祝い",
        "お礼": "お礼",
        "クリスマス": "クリスマス",
    }
    RECIPIENT_KEYWORDS = {
        "母": "母",
        "父": "父",
        "友人": "友人",
        "同僚": "同僚",
        "上司": "上司",
        "部下": "部下",
        "恋人": "恋人",
        "妻": "妻",
        "夫": "夫",
        "子供": "子供",
    }
    PREFERENCE_KEYWORDS = ("甘いもの", "お酒", "花", "実用的", "かわいい", "高級", "和風", "洋風")

    def __init__(self) -> None:
        self.llm_client = LLMClient()

    async def extract_conditions(self, *, message: str, existing_conditions: dict, history: list[dict]) -> tuple[dict, list[str]]:
        fallback = self._fallback_extract(message, existing_conditions)
        user_prompt = (
            f"既存条件: {existing_conditions}\n"
            f"履歴: {history[-6:]}\n"
            f"ユーザー発話: {message}\n"
            "conditions と missing_conditions を JSON で返してください。"
        )
        try:
            async with asyncio.timeout(10):
                payload = await self.llm_client.extract_json(CONVERSATION_PROMPT, user_prompt)
            conditions = payload.get("conditions")
            missing = payload.get("missing_conditions")
            if isinstance(conditions, dict) and isinstance(missing, list):
                merged = dict(existing_conditions)
                for key, value in conditions.items():
                    if value not in (None, "", [], {}):
                        merged[key] = value
                return merged, [str(item) for item in missing if str(item).strip()]
        except Exception:
            pass
        missing = [key for key in self.REQUIRED_CONDITIONS if not fallback.get(key)]
        return fallback, missing

    def build_followup_question(self, missing_conditions: list[str]) -> str:
        prompts = {
            "scene": "どのシーン向けのギフトですか。",
            "recipient": "誰に贈るギフトですか。",
            "budget": "予算はいくらくらいですか。",
            "preference": "好みや避けたいものがあれば教えてください。",
        }
        first = next((item for item in missing_conditions if item in prompts), None)
        if first is None:
            return "他に希望条件があれば教えてください。"
        return prompts[first]

    def _fallback_extract(self, message: str, existing_conditions: dict) -> dict:
        conditions = dict(existing_conditions)
        budget = self._extract_budget(message)
        if budget is not None:
            conditions["budget"] = budget
        for keyword, normalized in self.SCENE_KEYWORDS.items():
            if keyword in message:
                conditions["scene"] = normalized
                break
        for keyword, normalized in self.RECIPIENT_KEYWORDS.items():
            if keyword in message:
                conditions["recipient"] = normalized
                break
        preferences = [keyword for keyword in self.PREFERENCE_KEYWORDS if keyword in message]
        if preferences:
            conditions["preference"] = "、".join(preferences)
        if "NG" in message or "避け" in message or "なし" in message:
            conditions["ng_items"] = message.strip()
        return conditions

    @staticmethod
    def _extract_budget(message: str) -> float | None:
        match = re.search(r"(\d[\d,]*)\s*(円|万円|千円)", message)
        if not match:
            return None
        amount = float(match.group(1).replace(",", ""))
        unit = match.group(2)
        if unit == "万円":
            amount *= 10000
        elif unit == "千円":
            amount *= 1000
        return amount
