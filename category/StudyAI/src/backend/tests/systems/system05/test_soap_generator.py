from __future__ import annotations

import asyncio

from studyai.systems.system05.services.soap_generator import SOAPGenerator


def test_soap_generator_fallback_returns_all_sections() -> None:
    async def _run():
        generator = SOAPGenerator()
        generator.llm_client.extract_json = _raise  # type: ignore[method-assign]
        return await generator.generate_soap(memo="右肩が痛い。可動域制限あり。姿勢不良が原因。次回も経過観察。")

    async def _raise(*args, **kwargs):
        raise RuntimeError("llm unavailable")

    soap = asyncio.run(_run())

    assert soap["s"]
    assert soap["o"]
    assert soap["a"]
    assert soap["p"]
