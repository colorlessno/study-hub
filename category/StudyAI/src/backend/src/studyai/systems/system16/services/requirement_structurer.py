from __future__ import annotations

import re

from studyai.common.ai.llm_client import LLMClient
from studyai.systems.system16.prompts.match_prompt import REQUIREMENT_STRUCTURING_PROMPT
from studyai.systems.system16.services.skill_normalizer import AliasRule, SkillNormalizer


class RequirementStructurer:
    MUST_PATTERN = re.compile(r"(必須|must|required)(.*?)(歓迎|尚可|want|preferred|工程|役割|ドメイン|$)", re.IGNORECASE | re.DOTALL)
    WANT_PATTERN = re.compile(r"(歓迎|尚可|want|preferred)(.*?)(工程|役割|ドメイン|$)", re.IGNORECASE | re.DOTALL)
    PERIOD_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*年")

    def __init__(self) -> None:
        self.llm_client = LLMClient()
        self.normalizer = SkillNormalizer()

    async def parse_requirement(self, requirement_text: str, rules: list[AliasRule]) -> dict:
        llm_result = await self._try_llm(requirement_text)
        if llm_result:
            return self._normalize_llm_result(llm_result, rules)
        return self._fallback_parse(requirement_text, rules)

    async def _try_llm(self, requirement_text: str) -> dict | None:
        try:
            return await self.llm_client.extract_json(REQUIREMENT_STRUCTURING_PROMPT, requirement_text)
        except Exception:
            return None

    def _normalize_llm_result(self, llm_result: dict, rules: list[AliasRule]) -> dict:
        return {
            "required_technical_skills": self.normalizer.normalize_terms(list(llm_result.get("required_technical_skills", [])), rules, "technical"),
            "optional_technical_skills": self.normalizer.normalize_terms(list(llm_result.get("optional_technical_skills", [])), rules, "technical"),
            "process_experience": self.normalizer.normalize_terms(list(llm_result.get("process_experience", [])), rules, "process"),
            "domain_experience": self.normalizer.normalize_terms(list(llm_result.get("domain_experience", [])), rules, "domain"),
            "role_experience": self.normalizer.normalize_terms(list(llm_result.get("role_experience", [])), rules, "role"),
            "period": llm_result.get("period"),
        }

    def _fallback_parse(self, requirement_text: str, rules: list[AliasRule]) -> dict:
        must_segment = self._extract_segment(requirement_text, self.MUST_PATTERN)
        want_segment = self._extract_segment(requirement_text, self.WANT_PATTERN)

        must_catalog = self.normalizer.extract_catalog(must_segment or requirement_text, rules)
        want_catalog = self.normalizer.extract_catalog(want_segment, rules) if want_segment else {"technical_all": []}
        full_catalog = self.normalizer.extract_catalog(requirement_text, rules)

        period = None
        match = self.PERIOD_PATTERN.search(requirement_text)
        if match:
            period = f"{match.group(1)} years"

        return {
            "required_technical_skills": must_catalog["technical_all"],
            "optional_technical_skills": want_catalog.get("technical_all", []),
            "process_experience": full_catalog["processes"],
            "domain_experience": full_catalog["domains"],
            "role_experience": full_catalog["roles"],
            "period": period,
        }

    @staticmethod
    def _extract_segment(text: str, pattern: re.Pattern[str]) -> str:
        match = pattern.search(text)
        if not match:
            return ""
        return match.group(2).strip()
