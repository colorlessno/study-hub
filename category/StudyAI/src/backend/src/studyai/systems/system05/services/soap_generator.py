from __future__ import annotations

from studyai.common.ai.llm_client import LLMClient


SOAP_SYSTEM_PROMPT = """
You convert a treatment memo into SOAP format.
Return strict JSON with keys: s, o, a, p.
Keep each field concise and written in Japanese.
""".strip()


class SOAPGenerator:
    def __init__(self) -> None:
        self.llm_client = LLMClient()

    async def generate_soap(self, *, memo: str) -> dict:
        try:
            payload = await self.llm_client.extract_json(
                SOAP_SYSTEM_PROMPT,
                f"施術メモ:\n{memo}\nSOAPのJSONを返してください。",
            )
            soap = self._normalize_payload(payload)
            if soap:
                return soap
        except Exception:
            pass
        return self._fallback_soap(memo)

    @staticmethod
    def _normalize_payload(payload: dict) -> dict | None:
        soap = {
            "s": str(payload.get("s") or "").strip(),
            "o": str(payload.get("o") or "").strip(),
            "a": str(payload.get("a") or "").strip(),
            "p": str(payload.get("p") or "").strip(),
        }
        if all(soap.values()):
            return soap
        return None

    @staticmethod
    def _fallback_soap(memo: str) -> dict:
        lines = [line.strip() for line in memo.replace("。", "\n").splitlines() if line.strip()]
        subjective = lines[0] if lines else memo.strip()
        objective = lines[1] if len(lines) > 1 else memo.strip()
        assessment = lines[2] if len(lines) > 2 else "筋緊張と可動域の変化を継続観察する。"
        plan = lines[3] if len(lines) > 3 else "今回の内容を踏まえて次回施術方針を調整する。"
        return {"s": subjective, "o": objective, "a": assessment, "p": plan}
