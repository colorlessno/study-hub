from __future__ import annotations

from collections import Counter


class SalesScoringService:
    DEEP_QUESTION_KEYWORDS = ("課題", "原因", "背景", "いつから", "どの程度", "なぜ", "具体的")
    PROPOSAL_KEYWORDS = ("提案", "おすすめ", "改善", "解決", "導入", "プラン")
    NEXT_STEP_KEYWORDS = ("次回", "確認します", "送付", "見積", "日程", "連絡します", "フォロー")

    def score_sales_conversation(self, utterances: list[dict], metadata: dict | None = None) -> dict:
        metadata = metadata or {}
        staff_utterances = [item for item in utterances if item.get("speaker") in {"staff", "operator", "担当者"}]
        customer_utterances = [item for item in utterances if item.get("speaker") in {"customer", "顧客"}]
        total = len(staff_utterances) + len(customer_utterances)
        listening_ratio = round(len(customer_utterances) / total, 2) if total else 0.0

        staff_text = "\n".join(str(item.get("text") or "") for item in staff_utterances)
        issue_exploration = self._score_keyword_ratio(staff_text, self.DEEP_QUESTION_KEYWORDS)
        proposal_quality = self._score_keyword_ratio(staff_text, self.PROPOSAL_KEYWORDS)
        next_step_clarity = self._score_keyword_ratio(staff_text, self.NEXT_STEP_KEYWORDS)
        listening_score = int(min(100, max(0, listening_ratio * 180)))
        overall = round(
            issue_exploration * 0.3
            + proposal_quality * 0.3
            + next_step_clarity * 0.25
            + listening_score * 0.15
        )

        top_questions = self._top_questions(staff_utterances)
        return {
            "staff_id": metadata.get("staff_id"),
            "staff_name": metadata.get("staff_name"),
            "overall_score": int(overall),
            "issue_exploration": issue_exploration,
            "proposal_quality": proposal_quality,
            "next_step_clarity": next_step_clarity,
            "listening_ratio": listening_ratio,
            "top_questions": top_questions,
        }

    @staticmethod
    def _score_keyword_ratio(text: str, keywords: tuple[str, ...]) -> int:
        if not text.strip():
            return 0
        hits = sum(1 for keyword in keywords if keyword in text)
        return min(100, 35 + hits * 20) if hits else 30

    def _top_questions(self, staff_utterances: list[dict]) -> list[dict]:
        questions = [
            str(item.get("text") or "")
            for item in staff_utterances
            if "?" in str(item.get("text") or "") or "？" in str(item.get("text") or "") or "ですか" in str(item.get("text") or "")
        ]
        if not questions:
            return []
        counter = Counter("課題深掘り" if any(k in q for k in self.DEEP_QUESTION_KEYWORDS) else "確認質問" for q in questions)
        return [
            {
                "question_type": question_type,
                "count": count,
                "example": next((q for q in questions if (question_type == "課題深掘り") == any(k in q for k in self.DEEP_QUESTION_KEYWORDS)), questions[0]),
            }
            for question_type, count in counter.most_common(3)
        ]
