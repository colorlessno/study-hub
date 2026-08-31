from __future__ import annotations

import base64
import hashlib
import io
import json
import math
import re
import unicodedata
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from time import perf_counter
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.ai.llm_client import LLMClient
from studyai.common.ai.vlm_client import VLMClient
from studyai.common.config.settings import get_settings
from studyai.systems.ai_learning.catalog import SYSTEMS, LearningSystem


class LearningSystemService:
    def __init__(
        self,
        embedding_client: EmbeddingClient | None = None,
        generation_client: LLMClient | None = None,
        vlm_client: VLMClient | None = None,
        system17_run_file: Path | None = None,
        system18_run_file: Path | None = None,
        system19_run_file: Path | None = None,
        system20_run_file: Path | None = None,
        system21_run_file: Path | None = None,
        system22_run_file: Path | None = None,
        system23_run_file: Path | None = None,
        system24_run_file: Path | None = None,
        system25_run_file: Path | None = None,
        system26_run_file: Path | None = None,
        system27_run_file: Path | None = None,
        system28_run_file: Path | None = None,
        system29_run_file: Path | None = None,
        system30_run_file: Path | None = None,
        system31_run_file: Path | None = None,
        system32_run_file: Path | None = None,
        system33_run_file: Path | None = None,
        system34_run_file: Path | None = None,
        system35_run_file: Path | None = None,
        system36_run_file: Path | None = None,
    ) -> None:
        self._runs: dict[str, list[dict[str, Any]]] = {system_id: [] for system_id in SYSTEMS}
        self._embedding_client = embedding_client or EmbeddingClient()
        self._generation_client = generation_client or LLMClient()
        self._vlm_client = vlm_client or VLMClient()
        self._system17_run_file = system17_run_file
        self._system18_run_file = system18_run_file
        self._system19_run_file = system19_run_file
        self._system20_run_file = system20_run_file
        self._system21_run_file = system21_run_file
        self._system22_run_file = system22_run_file
        self._system23_run_file = system23_run_file
        self._system24_run_file = system24_run_file
        self._system25_run_file = system25_run_file
        self._system26_run_file = system26_run_file
        self._system27_run_file = system27_run_file
        self._system28_run_file = system28_run_file
        self._system29_run_file = system29_run_file
        self._system30_run_file = system30_run_file
        self._system31_run_file = system31_run_file
        self._system32_run_file = system32_run_file
        self._system33_run_file = system33_run_file
        self._system34_run_file = system34_run_file
        self._system35_run_file = system35_run_file
        self._system36_run_file = system36_run_file
        self._load_system17_runs()
        self._load_system18_runs()
        self._load_system19_runs()
        self._load_system20_runs()
        self._load_system21_runs()
        self._load_system22_runs()
        self._load_system23_runs()
        self._load_system24_runs()
        self._load_system25_runs()
        self._load_system26_runs()
        self._load_system27_runs()
        self._load_system28_runs()
        self._load_system29_runs()
        self._load_system30_runs()
        self._load_system31_runs()
        self._load_system32_runs()
        self._load_system33_runs()
        self._load_system34_runs()
        self._load_system35_runs()
        self._load_system36_runs()

    def get_system(self, system_id: str) -> LearningSystem:
        if system_id not in SYSTEMS:
            raise KeyError(system_id)
        return SYSTEMS[system_id]

    def execute(self, system_id: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        system = self.get_system(system_id)
        input_data = {**system.default_input, **(payload or {})}
        if system.category == "embedding":
            raise ValueError("system18はEmbedding APIと通信するため、非同期の実行入口を使用してください。")
        if system.category == "generation" and input_data.get("mode", "model") == "model":
            raise ValueError("system21はLLM APIと通信するため、非同期の実行入口を使用してください。")
        if system.category == "reranker" and input_data.get("mode", "model") == "model":
            raise ValueError("system23はEmbedding APIと通信するため、非同期の実行入口を使用してください。")
        if system.category == "model_compare" and input_data.get("mode", "model") == "model":
            raise ValueError("system24は複数のLLMへ通信するため、非同期の実行入口を使用してください。")
        if system.category == "output_control" and input_data.get("mode", "model") == "model":
            raise ValueError("system25はLLM APIと通信するため、非同期の実行入口を使用してください。")
        if system.category == "quantization" and input_data.get("mode", "mock") == "model":
            raise ValueError("system26はLLM APIと通信するため、非同期の実行入口を使用してください。")
        if system.category == "vlm" and input_data.get("mode", "mock") == "model":
            raise ValueError("system27はVLM APIへ画像を送信するため、非同期の実行入口を使用してください。")
        result = self._execute_by_category(system.category, input_data)
        return self._store_run(system, input_data, result)

    async def execute_async(self, system_id: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        system = self.get_system(system_id)
        input_data = {**system.default_input, **(payload or {})}
        if system.category == "embedding":
            result = await self._embedding(input_data)
        elif system.category == "generation":
            result = await self._generation_async(input_data)
        elif system.category == "reranker" and input_data.get("mode", "model") == "model":
            result = await self._reranker_async(input_data)
        elif system.category == "model_compare" and input_data.get("mode", "model") == "model":
            result = await self._model_compare_async(input_data)
        elif system.category == "output_control" and input_data.get("mode", "model") == "model":
            result = await self._output_control_async(input_data)
        elif system.category == "quantization" and input_data.get("mode", "mock") == "model":
            result = await self._quantization_async(input_data)
        elif system.category == "vlm" and input_data.get("mode", "mock") == "model":
            result = await self._vlm_async(input_data)
        else:
            result = self._execute_by_category(system.category, input_data)
        return self._store_run(system, input_data, result)

    def _store_run(
        self,
        system: LearningSystem,
        input_data: dict[str, Any],
        result: dict[str, Any],
    ) -> dict[str, Any]:
        if system.system_id == "system17":
            result = {
                **result,
                "saved": self._system17_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system17_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system18":
            result = {
                **result,
                "saved": self._system18_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system18_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system19":
            result = {
                **result,
                "saved": self._system19_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system19_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system20":
            result = {
                **result,
                "saved": self._system20_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system20_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system21":
            result = {
                **result,
                "saved": self._system21_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system21_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system22":
            result = {
                **result,
                "saved": self._system22_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system22_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system23":
            result = {
                **result,
                "saved": self._system23_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system23_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system24":
            result = {
                **result,
                "saved": self._system24_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system24_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system25":
            result = {
                **result,
                "saved": self._system25_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system25_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system26":
            result = {
                **result,
                "saved": self._system26_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system26_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system27":
            result = {
                **result,
                "saved": self._system27_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system27_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system28":
            result = {
                **result,
                "saved": self._system28_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system28_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system29":
            result = {
                **result,
                "saved": self._system29_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system29_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system30":
            result = {
                **result,
                "saved": self._system30_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system30_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system31":
            result = {
                **result,
                "saved": self._system31_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system31_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system32":
            result = {
                **result,
                "saved": self._system32_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system32_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system33":
            result = {
                **result,
                "saved": self._system33_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system33_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system34":
            result = {
                **result,
                "saved": self._system34_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system34_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system35":
            result = {
                **result,
                "saved": self._system35_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system35_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        elif system.system_id == "system36":
            result = {
                **result,
                "saved": self._system36_run_file is not None,
                "storage_status": (
                    "JSONファイルへ保存済み"
                    if self._system36_run_file is not None
                    else "永続保存先を指定していないため、実行中の履歴だけに保持"
                ),
            }
        created_at = datetime.now(timezone.utc).isoformat()
        stored_input = input_data
        if system.system_id == "system36":
            stored_input = self._trace_storage_input(input_data)
            result = {
                **result,
                "recorded_at": created_at,
                "trace_record": {**result["trace_record"], "recorded_at": created_at},
            }
        run = {
            "run_id": self._run_id(system.system_id, input_data),
            "system_id": system.system_id,
            "title": system.title,
            "category": system.category,
            "input": stored_input,
            "result": result,
            "observation": system.observation_hint,
            "created_at": created_at,
        }
        self._runs[system.system_id].insert(0, run)
        self._runs[system.system_id] = self._runs[system.system_id][:20]
        if system.system_id == "system17":
            self._persist_system17_runs()
        elif system.system_id == "system18":
            self._persist_system18_runs()
        elif system.system_id == "system19":
            self._persist_system19_runs()
        elif system.system_id == "system20":
            self._persist_system20_runs()
        elif system.system_id == "system21":
            self._persist_system21_runs()
        elif system.system_id == "system22":
            self._persist_system22_runs()
        elif system.system_id == "system23":
            self._persist_system23_runs()
        elif system.system_id == "system24":
            self._persist_system24_runs()
        elif system.system_id == "system25":
            self._persist_system25_runs()
        elif system.system_id == "system26":
            self._persist_system26_runs()
        elif system.system_id == "system27":
            self._persist_system27_runs()
        elif system.system_id == "system28":
            self._persist_system28_runs()
        elif system.system_id == "system29":
            self._persist_system29_runs()
        elif system.system_id == "system30":
            self._persist_system30_runs()
        elif system.system_id == "system31":
            self._persist_system31_runs()
        elif system.system_id == "system32":
            self._persist_system32_runs()
        elif system.system_id == "system33":
            self._persist_system33_runs()
        elif system.system_id == "system34":
            self._persist_system34_runs()
        elif system.system_id == "system35":
            self._persist_system35_runs()
        elif system.system_id == "system36":
            self._persist_system36_runs()
        return run

    def _load_system17_runs(self) -> None:
        if self._system17_run_file is None or not self._system17_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system17_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system17の実行履歴を読み込めません: {self._system17_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system17の実行履歴の形式が不正です: {self._system17_run_file}")
        self._runs["system17"] = saved_runs[:20]

    def _persist_system17_runs(self) -> None:
        if self._system17_run_file is None:
            return
        self._system17_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system17_run_file.with_suffix(f"{self._system17_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system17"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system17_run_file)

    def _load_system18_runs(self) -> None:
        if self._system18_run_file is None or not self._system18_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system18_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system18の実行履歴を読み込めません: {self._system18_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system18の実行履歴の形式が不正です: {self._system18_run_file}")
        self._runs["system18"] = saved_runs[:20]

    def _persist_system18_runs(self) -> None:
        if self._system18_run_file is None:
            return
        self._system18_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system18_run_file.with_suffix(f"{self._system18_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system18"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system18_run_file)

    def _load_system19_runs(self) -> None:
        if self._system19_run_file is None or not self._system19_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system19_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system19の実行履歴を読み込めません: {self._system19_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system19の実行履歴の形式が不正です: {self._system19_run_file}")
        self._runs["system19"] = saved_runs[:20]

    def _persist_system19_runs(self) -> None:
        if self._system19_run_file is None:
            return
        self._system19_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system19_run_file.with_suffix(f"{self._system19_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system19"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system19_run_file)

    def _load_system20_runs(self) -> None:
        if self._system20_run_file is None or not self._system20_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system20_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system20の実行履歴を読み込めません: {self._system20_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system20の実行履歴の形式が不正です: {self._system20_run_file}")
        self._runs["system20"] = saved_runs[:20]

    def _persist_system20_runs(self) -> None:
        if self._system20_run_file is None:
            return
        self._system20_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system20_run_file.with_suffix(f"{self._system20_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system20"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system20_run_file)

    def _load_system21_runs(self) -> None:
        if self._system21_run_file is None or not self._system21_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system21_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system21の実行履歴を読み込めません: {self._system21_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system21の実行履歴の形式が不正です: {self._system21_run_file}")
        self._runs["system21"] = saved_runs[:20]

    def _persist_system21_runs(self) -> None:
        if self._system21_run_file is None:
            return
        self._system21_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system21_run_file.with_suffix(f"{self._system21_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system21"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system21_run_file)

    def _load_system22_runs(self) -> None:
        if self._system22_run_file is None or not self._system22_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system22_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system22の実行履歴を読み込めません: {self._system22_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system22の実行履歴の形式が不正です: {self._system22_run_file}")
        self._runs["system22"] = saved_runs[:20]

    def _persist_system22_runs(self) -> None:
        if self._system22_run_file is None:
            return
        self._system22_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system22_run_file.with_suffix(f"{self._system22_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system22"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system22_run_file)

    def _load_system23_runs(self) -> None:
        if self._system23_run_file is None or not self._system23_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system23_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system23の実行履歴を読み込めません: {self._system23_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system23の実行履歴の形式が不正です: {self._system23_run_file}")
        self._runs["system23"] = saved_runs[:20]

    def _persist_system23_runs(self) -> None:
        if self._system23_run_file is None:
            return
        self._system23_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system23_run_file.with_suffix(f"{self._system23_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system23"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system23_run_file)

    def _load_system24_runs(self) -> None:
        if self._system24_run_file is None or not self._system24_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system24_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system24の実行履歴を読み込めません: {self._system24_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system24の実行履歴の形式が不正です: {self._system24_run_file}")
        self._runs["system24"] = saved_runs[:20]

    def _persist_system24_runs(self) -> None:
        if self._system24_run_file is None:
            return
        self._system24_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system24_run_file.with_suffix(f"{self._system24_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system24"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system24_run_file)

    def _load_system25_runs(self) -> None:
        if self._system25_run_file is None or not self._system25_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system25_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system25の実行履歴を読み込めません: {self._system25_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system25の実行履歴の形式が不正です: {self._system25_run_file}")
        self._runs["system25"] = saved_runs[:20]

    def _persist_system25_runs(self) -> None:
        if self._system25_run_file is None:
            return
        self._system25_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system25_run_file.with_suffix(f"{self._system25_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system25"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system25_run_file)

    def _load_system26_runs(self) -> None:
        if self._system26_run_file is None or not self._system26_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system26_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system26の実行履歴を読み込めません: {self._system26_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system26の実行履歴の形式が不正です: {self._system26_run_file}")
        self._runs["system26"] = saved_runs[:20]

    def _persist_system26_runs(self) -> None:
        if self._system26_run_file is None:
            return
        self._system26_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system26_run_file.with_suffix(f"{self._system26_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system26"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system26_run_file)

    def _load_system27_runs(self) -> None:
        if self._system27_run_file is None or not self._system27_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system27_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system27の実行履歴を読み込めません: {self._system27_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system27の実行履歴の形式が不正です: {self._system27_run_file}")
        self._runs["system27"] = saved_runs[:20]

    def _persist_system27_runs(self) -> None:
        if self._system27_run_file is None:
            return
        self._system27_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system27_run_file.with_suffix(f"{self._system27_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system27"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system27_run_file)

    def _load_system28_runs(self) -> None:
        if self._system28_run_file is None or not self._system28_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system28_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system28の実行履歴を読み込めません: {self._system28_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system28の実行履歴の形式が不正です: {self._system28_run_file}")
        self._runs["system28"] = saved_runs[:20]

    def _persist_system28_runs(self) -> None:
        if self._system28_run_file is None:
            return
        self._system28_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system28_run_file.with_suffix(f"{self._system28_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system28"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system28_run_file)

    def _load_system29_runs(self) -> None:
        if self._system29_run_file is None or not self._system29_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system29_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system29の実行履歴を読み込めません: {self._system29_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system29の実行履歴の形式が不正です: {self._system29_run_file}")
        self._runs["system29"] = saved_runs[:20]

    def _persist_system29_runs(self) -> None:
        if self._system29_run_file is None:
            return
        self._system29_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system29_run_file.with_suffix(f"{self._system29_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system29"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system29_run_file)

    def _load_system30_runs(self) -> None:
        if self._system30_run_file is None or not self._system30_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system30_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system30の実行履歴を読み込めません: {self._system30_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system30の実行履歴の形式が不正です: {self._system30_run_file}")
        self._runs["system30"] = saved_runs[:20]

    def _persist_system30_runs(self) -> None:
        if self._system30_run_file is None:
            return
        self._system30_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system30_run_file.with_suffix(f"{self._system30_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system30"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system30_run_file)

    def _load_system31_runs(self) -> None:
        if self._system31_run_file is None or not self._system31_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system31_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system31の実行履歴を読み込めません: {self._system31_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system31の実行履歴の形式が不正です: {self._system31_run_file}")
        self._runs["system31"] = saved_runs[:20]

    def _persist_system31_runs(self) -> None:
        if self._system31_run_file is None:
            return
        self._system31_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system31_run_file.with_suffix(f"{self._system31_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system31"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system31_run_file)

    def _load_system32_runs(self) -> None:
        if self._system32_run_file is None or not self._system32_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system32_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system32の実行履歴を読み込めません: {self._system32_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system32の実行履歴の形式が不正です: {self._system32_run_file}")
        self._runs["system32"] = saved_runs[:20]

    def _persist_system32_runs(self) -> None:
        if self._system32_run_file is None:
            return
        self._system32_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system32_run_file.with_suffix(f"{self._system32_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system32"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system32_run_file)

    def _load_system33_runs(self) -> None:
        if self._system33_run_file is None or not self._system33_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system33_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system33の実行履歴を読み込めません: {self._system33_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system33の実行履歴の形式が不正です: {self._system33_run_file}")
        self._runs["system33"] = saved_runs[:20]

    def _persist_system33_runs(self) -> None:
        if self._system33_run_file is None:
            return
        self._system33_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system33_run_file.with_suffix(f"{self._system33_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system33"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system33_run_file)

    def _load_system34_runs(self) -> None:
        if self._system34_run_file is None or not self._system34_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system34_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system34の実行履歴を読み込めません: {self._system34_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system34の実行履歴の形式が不正です: {self._system34_run_file}")
        self._runs["system34"] = saved_runs[:20]

    def _persist_system34_runs(self) -> None:
        if self._system34_run_file is None:
            return
        self._system34_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system34_run_file.with_suffix(f"{self._system34_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system34"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system34_run_file)

    def _load_system35_runs(self) -> None:
        if self._system35_run_file is None or not self._system35_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system35_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system35の実行履歴を読み込めません: {self._system35_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system35の実行履歴の形式が不正です: {self._system35_run_file}")
        self._runs["system35"] = saved_runs[:20]

    def _persist_system35_runs(self) -> None:
        if self._system35_run_file is None:
            return
        self._system35_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system35_run_file.with_suffix(f"{self._system35_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system35"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system35_run_file)

    def _load_system36_runs(self) -> None:
        if self._system36_run_file is None or not self._system36_run_file.exists():
            return
        try:
            saved_runs = json.loads(self._system36_run_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"system36のTrace履歴を読み込めません: {self._system36_run_file}") from exc
        if not isinstance(saved_runs, list) or any(not isinstance(run, dict) for run in saved_runs):
            raise RuntimeError(f"system36のTrace履歴の形式が不正です: {self._system36_run_file}")
        self._runs["system36"] = saved_runs[:20]

    def _persist_system36_runs(self) -> None:
        if self._system36_run_file is None:
            return
        self._system36_run_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_file = self._system36_run_file.with_suffix(f"{self._system36_run_file.suffix}.tmp")
        temporary_file.write_text(
            json.dumps(self._runs["system36"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(self._system36_run_file)

    def list_runs(self, system_id: str) -> list[dict[str, Any]]:
        self.get_system(system_id)
        return self._runs[system_id]

    def _execute_by_category(self, category: str, data: dict[str, Any]) -> dict[str, Any]:
        handlers = {
            "tokenizer": self._tokenizer,
            "attention": self._attention,
            "context": self._context,
            "generation": self._generation,
            "chunking": self._chunking,
            "reranker": self._reranker,
            "model_compare": self._model_compare,
            "output_control": self._output_control,
            "quantization": self._quantization,
            "vlm": self._vlm,
            "ocr_normalize": self._ocr_normalize,
            "metadata": self._metadata,
            "duplicate": self._duplicate,
            "ground_truth": self._ground_truth,
            "rag_eval": self._rag_eval,
            "retrieval_eval": self._retrieval_eval,
            "answer_eval": self._answer_eval,
            "prompt_ab": self._prompt_ab,
            "trace": self._trace,
        }
        return handlers[category](data)

    def _tokenizer(self, data: dict[str, Any]) -> dict[str, Any]:
        text = str(data.get("text", ""))
        tokens = self._tokens(text)
        limit = int(data.get("context_limit", 128))
        if not text.strip():
            raise ValueError("textを入力してください。")
        if limit <= 0:
            raise ValueError("context_limitは1以上を指定してください。")
        notes = ["この結果は学習用の簡易分割であり、実際のAIモデルのトークン数とは異なります。"]
        if re.search(r"[^\x00-\x7f]", text):
            notes.append("日本語は空白が少ないため、簡易規則では1文字ずつ分割される部分があります。")
        if re.search(r"\s", text):
            notes.append("空白と改行は分割の境界になりますが、分割結果には表示されません。")
        if len(tokens) > limit:
            notes.append("推定トークン数が入力上限を超えています。文章の短縮または上限の見直しが必要です。")
        return {
            "char_count": len(text),
            "estimated_tokens": len(tokens),
            "token_segments": tokens,
            "over_limit": len(tokens) > limit,
            "notes": notes,
        }

    async def _embedding(self, data: dict[str, Any]) -> dict[str, Any]:
        query = str(data.get("query", "")).strip()
        raw_documents = data.get("documents", [])
        if not isinstance(raw_documents, list):
            raise ValueError("documentsは文章の配列で指定してください。")
        documents = [str(document).strip() for document in raw_documents]
        if not query:
            raise ValueError("queryを入力してください。")
        if not documents or any(not document for document in documents):
            raise ValueError("documentsには空でない文章を1件以上指定してください。")
        top_k = int(data.get("top_k", len(documents)))
        if top_k < 1 or top_k > len(documents):
            raise ValueError("top_kは1以上、候補文書数以下で指定してください。")

        embeddings: list[list[float]] = []
        for text in [query, *documents]:
            response_vectors = await self._embedding_client.embed([text])
            if len(response_vectors) != 1:
                raise ValueError("Embedding APIから入力1件に対して1件のベクトルが返されませんでした。")
            embeddings.append(response_vectors[0])
        if len(embeddings) != len(documents) + 1:
            raise ValueError("Embedding APIから入力件数と異なる数のベクトルが返されました。")
        dimension = len(embeddings[0])
        if dimension == 0 or any(len(vector) != dimension for vector in embeddings):
            raise ValueError("Embedding APIから有効な同一次元のベクトルが返されませんでした。")

        query_vector = embeddings[0]
        stored_documents = [
            {
                "document_id": f"doc-{index + 1}",
                "text": document,
                "embedding": embeddings[index + 1],
                "dimension": dimension,
            }
            for index, document in enumerate(documents)
        ]
        ranked = sorted(
            [
                {
                    "document_id": document["document_id"],
                    "text": document["text"],
                    "evidence_text": document["text"],
                    "score": self._cosine_similarity(query_vector, document["embedding"]),
                }
                for document in stored_documents
            ],
            key=lambda item: item["score"],
            reverse=True,
        )
        results = [{**item, "rank": index + 1} for index, item in enumerate(ranked[:top_k])]
        return {
            "query": query,
            "mode": "embedding",
            "embedding_model": get_settings().get_embedding_model(),
            "embedding_dimension": dimension,
            "stored_document_count": len(stored_documents),
            "storage_status": "サーバーの実行履歴にEmbeddingベクトルと検索結果を保存しました（最新20件）。",
            "query_embedding": query_vector,
            "vector_storage": stored_documents,
            "results": results,
        }

    def _attention(self, data: dict[str, Any]) -> dict[str, Any]:
        tokens = self._attention_tokens(str(data.get("sentence", "")))
        semantic_links = self._attention_semantic_links(tokens)
        matrix = []
        for i, left in enumerate(tokens):
            row = []
            for j, right in enumerate(tokens):
                semantic_bonus = semantic_links.get((i, j), {}).get("bonus", 0.0)
                row.append(round(1 / (1 + abs(i - j)) + (0.2 if left == right else 0) + semantic_bonus, 3))
            matrix.append(row)
        requested_focus = int(data.get("focus_token_index", 0))
        focus = min(max(requested_focus, 0), len(tokens) - 1) if tokens else 0
        return {
            "tokens": tokens,
            "attention_matrix": matrix,
            "focus_token_index": focus,
            "focus_relations": matrix[focus] if tokens else [],
            "relation_reasons": [
                {
                    "from_index": left,
                    "from_token": tokens[left],
                    "to_index": right,
                    "to_token": tokens[right],
                    "reason": details["reason"],
                    "bonus": details["bonus"],
                }
                for (left, right), details in semantic_links.items()
                if left < right
            ],
            "score_note": "実際のTransformerのAttentionではなく、位置・同一語・指示語・修飾語から作った観察用の疑似スコアです。",
        }

    def _attention_tokens(self, text: str) -> list[str]:
        normalized = text.strip()
        if not normalized:
            return []
        if re.search(r"\s", normalized):
            return [token for token in re.split(r"\s+", normalized) if token]
        return self._tokens(normalized)

    def _attention_semantic_links(self, tokens: list[str]) -> dict[tuple[int, int], dict[str, Any]]:
        links: dict[tuple[int, int], dict[str, Any]] = {}
        particles = {"は", "が", "を", "に", "へ", "で", "と", "の", "も", "や", "から", "まで"}
        punctuation = {"。", "、", ".", ",", "!", "?", "！", "？"}
        pronouns = {"これ", "それ", "あれ", "この", "その", "あの", "彼", "彼女", "同社", "同商品"}
        predicate_words = {"する", "した", "なる", "なった", "売り切れた", "到着した", "予約した"}

        def add_link(left: int, right: int, bonus: float, reason: str) -> None:
            links[(left, right)] = {"bonus": bonus, "reason": reason}
            links[(right, left)] = {"bonus": bonus, "reason": reason}

        for index, token in enumerate(tokens):
            if token in pronouns:
                antecedent = next(
                    (
                        candidate
                        for candidate in range(index - 1, -1, -1)
                        if tokens[candidate] not in particles
                        and tokens[candidate] not in punctuation
                        and tokens[candidate] not in pronouns
                        and tokens[candidate] not in predicate_words
                    ),
                    None,
                )
                if antecedent is not None:
                    add_link(antecedent, index, 0.45, "指示語と、その前にある参照候補の関係")

            if (token.endswith("い") or token.endswith("な")) and index + 1 < len(tokens):
                modified = next(
                    (
                        candidate
                        for candidate in range(index + 1, len(tokens))
                        if tokens[candidate] not in particles and tokens[candidate] not in punctuation
                    ),
                    None,
                )
                if modified is not None:
                    add_link(index, modified, 0.35, "修飾語と、その直後にある語の関係")

        return links

    def _context(self, data: dict[str, Any]) -> dict[str, Any]:
        text = str(data.get("text", ""))
        marker = str(data.get("important_marker", "")).strip()
        try:
            limit = int(data.get("context_limit", 128))
        except (TypeError, ValueError) as exc:
            raise ValueError("context_limitは1以上の整数で指定してください。") from exc
        if not text.strip():
            raise ValueError("textを入力してください。")
        if limit <= 0:
            raise ValueError("context_limitは1以上を指定してください。")
        if not marker:
            raise ValueError("important_markerを入力してください。")

        marker_start = text.find(marker)
        if marker_start < 0:
            raise ValueError("important_markerはtext内に含まれる語句を指定してください。")

        token_matches = list(re.finditer(r"[A-Za-z0-9_]+|[^\sA-Za-z0-9_]", text))
        retained_token_count = min(limit, len(token_matches))
        retained_end = token_matches[retained_token_count - 1].end() if retained_token_count else 0
        retained_text = text[:retained_end]
        discarded_text = text[retained_end:]
        marker_end = marker_start + len(marker)
        marker_retained = marker_end <= retained_end
        marker_center = marker_start + (len(marker) / 2)
        marker_ratio = marker_center / max(1, len(text))
        if marker_ratio < 1 / 3:
            important_position = "先頭"
        elif marker_ratio < 2 / 3:
            important_position = "中央"
        else:
            important_position = "末尾"

        over_limit_count = max(0, len(token_matches) - limit)
        mitigation_options = []
        if over_limit_count:
            mitigation_options.extend(["文章を分割する", "重要な部分を検索してから入力する", "内容を要約してから入力する"])
        if not marker_retained:
            answer_result = "重要情報が入力上限外にあるため、この入力だけでは回答できません。"
        else:
            answer_result = f"上限内の文章から「{marker}」を確認できます。"
        return {
            "estimated_tokens": len(token_matches),
            "context_limit": limit,
            "retained_token_count": retained_token_count,
            "over_limit_token_count": over_limit_count,
            "truncated": bool(discarded_text),
            "important_marker": marker,
            "important_position": important_position,
            "marker_retained": marker_retained,
            "answerable": marker_retained,
            "answer_result": answer_result,
            "retained_text": retained_text,
            "discarded_text": discarded_text,
            "missing_markers": [] if marker_retained else [marker],
            "mitigation_options": mitigation_options,
            "notes": [
                "推定トークン数は学習用の簡易分割であり、実際のAIモデルの値とは異なります。",
                "回答可否は、指定した重要語句が上限内へ完全に残ったかで判定しています。",
            ],
        }

    def _generation(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._validate_generation_input(data)
        if conditions["mode"] != "mock":
            raise ValueError("実モデルで比較する場合は非同期の実行入口を使用してください。")
        runs = []
        variants = ["要点を簡潔に整理した回答", "別の表現を使った回答", "補足を加えた回答"]
        for temperature in conditions["temperatures"]:
            for trial in range(conditions["trial_count"]):
                variant_index = 0 if temperature <= 0.3 else trial % len(variants)
                runs.append(
                    {
                        "temperature": temperature,
                        "trial": trial + 1,
                        "text": f"{conditions['prompt']}：{variants[variant_index]}（モック）",
                        "mode": "mock",
                        "model": "明示的なモック",
                        "input_tokens": None,
                        "output_tokens": None,
                    }
                )
        return self._generation_result(conditions, runs)

    async def _generation_async(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._validate_generation_input(data)
        if conditions["mode"] == "mock":
            return self._generation(data)
        runs = []
        for temperature in conditions["temperatures"]:
            for trial in range(conditions["trial_count"]):
                generated = await self._generation_client.generate_text_with_metadata(
                    conditions["prompt"],
                    temperature,
                )
                runs.append(
                    {
                        "temperature": temperature,
                        "trial": trial + 1,
                        "text": generated["text"],
                        "mode": "model",
                        "model": generated["model"],
                        "input_tokens": generated.get("input_tokens"),
                        "output_tokens": generated.get("output_tokens"),
                    }
                )
        return self._generation_result(conditions, runs)

    @staticmethod
    def _validate_generation_input(data: dict[str, Any]) -> dict[str, Any]:
        prompt = str(data.get("prompt", "")).strip()
        if not prompt:
            raise ValueError("promptを入力してください。")
        raw_temperatures = data.get("temperatures", [])
        if not isinstance(raw_temperatures, list) or len(raw_temperatures) < 2:
            raise ValueError("temperaturesは比較する数値を2件以上指定してください。")
        try:
            temperatures = [float(value) for value in raw_temperatures]
        except (TypeError, ValueError) as exc:
            raise ValueError("temperaturesは数値の配列で指定してください。") from exc
        if any(value < 0 or value > 2 for value in temperatures):
            raise ValueError("Temperatureは0以上2以下で指定してください。")
        if len(set(temperatures)) != len(temperatures):
            raise ValueError("比較するTemperatureは重複しない値を指定してください。")
        try:
            trial_count = int(data.get("trial_count", 0))
        except (TypeError, ValueError) as exc:
            raise ValueError("trial_countは1以上5以下の整数で指定してください。") from exc
        if trial_count < 1 or trial_count > 5:
            raise ValueError("trial_countは1以上5以下の整数で指定してください。")
        if isinstance(data.get("trial_count"), float) and not float(data["trial_count"]).is_integer():
            raise ValueError("trial_countは整数で指定してください。")
        mode = str(data.get("mode", "model")).strip().lower()
        if mode not in {"model", "mock"}:
            raise ValueError("modeはmodelまたはmockを指定してください。")
        task_type = str(data.get("task_type", "fixed")).strip().lower()
        if task_type not in {"fixed", "creative"}:
            raise ValueError("task_typeはfixedまたはcreativeを指定してください。")
        raw_note = data.get("learning_note", {})
        if not isinstance(raw_note, dict):
            raise ValueError("learning_noteはobjectで指定してください。")
        learning_note = {
            key: str(raw_note.get(key, "")).strip()
            for key in ("observation", "decision", "risk_note")
        }
        return {
            "prompt": prompt,
            "temperatures": temperatures,
            "trial_count": trial_count,
            "mode": mode,
            "task_type": task_type,
            "learning_note": learning_note,
        }

    @staticmethod
    def _generation_result(conditions: dict[str, Any], runs: list[dict[str, Any]]) -> dict[str, Any]:
        summaries = []
        for temperature in conditions["temperatures"]:
            responses = [run["text"] for run in runs if run["temperature"] == temperature]
            summaries.append(
                {
                    "temperature": temperature,
                    "trial_count": len(responses),
                    "unique_response_count": len(set(responses)),
                    "average_length": round(sum(len(text) for text in responses) / len(responses), 1),
                    "reproducibility_ratio": round((len(responses) - len(set(responses)) + 1) / len(responses), 2),
                }
            )
        recommendation = (
            "定型業務では、回答の再現性を確認しながら低いTemperatureから検討します。"
            if conditions["task_type"] == "fixed"
            else "発想業務では、候補の多様性を確認しながら高いTemperatureも比較します。"
        )
        return {
            "generation_mode": conditions["mode"],
            "fixed_conditions": {"prompt": conditions["prompt"], "trial_count": conditions["trial_count"]},
            "runs": runs,
            "diff_summary": {
                "count": len(runs),
                "unique_response_count": len({run["text"] for run in runs}),
                "per_temperature": summaries,
            },
            "task_type": conditions["task_type"],
            "recommendation": recommendation,
            "learning_note": conditions["learning_note"],
            "notes": [
                "modelは実際のOpenAI互換APIへ通信した結果です。" if conditions["mode"] == "model" else "mockは画面と比較手順を確認する明示的な模擬結果です。",
                "Temperature以外の条件を固定し、同じ値でも複数回実行した結果を比較します。",
            ],
        }

    def _chunking(self, data: dict[str, Any]) -> dict[str, Any]:
        document = str(data.get("document", "")).strip()
        if not document:
            raise ValueError("documentを入力してください。")
        if len(document) > 20_000:
            raise ValueError("documentは20000文字以内で指定してください。")

        raw_questions = data.get("question_set", [])
        if not isinstance(raw_questions, list) or not raw_questions or len(raw_questions) > 20:
            raise ValueError("question_setは1件以上20件以下の配列で指定してください。")
        questions: list[dict[str, Any]] = []
        for index, raw_question in enumerate(raw_questions, start=1):
            if not isinstance(raw_question, dict):
                raise ValueError(f"question_setの{index}件目はオブジェクトで指定してください。")
            question = str(raw_question.get("question", "")).strip()
            raw_terms = raw_question.get("expected_terms", [])
            if not question:
                raise ValueError(f"question_setの{index}件目にquestionを指定してください。")
            if not isinstance(raw_terms, list) or not raw_terms:
                raise ValueError(f"question_setの{index}件目にexpected_termsを1件以上指定してください。")
            expected_terms = [str(term).strip() for term in raw_terms]
            if any(not term for term in expected_terms):
                raise ValueError(f"question_setの{index}件目のexpected_termsに空文字は指定できません。")
            questions.append({"question": question, "expected_terms": expected_terms})

        raw_configs = data.get("chunk_configs", [])
        if not isinstance(raw_configs, list) or len(raw_configs) < 2 or len(raw_configs) > 8:
            raise ValueError("chunk_configsは比較する2件以上8件以下の配列で指定してください。")
        configs: list[dict[str, Any]] = []
        config_ids: set[str] = set()
        for index, raw_config in enumerate(raw_configs, start=1):
            if not isinstance(raw_config, dict):
                raise ValueError(f"chunk_configsの{index}件目はオブジェクトで指定してください。")
            config_id = str(raw_config.get("id", "")).strip()
            label = str(raw_config.get("label", "")).strip()
            chunk_size = raw_config.get("chunk_size")
            overlap = raw_config.get("overlap")
            if not config_id or config_id in config_ids:
                raise ValueError("chunk_configsのidは空でない一意の値を指定してください。")
            if not label:
                raise ValueError(f"chunk_configsの{index}件目にlabelを指定してください。")
            if isinstance(chunk_size, bool) or not isinstance(chunk_size, int) or chunk_size < 1:
                raise ValueError(f"chunk_configsの{index}件目のchunk_sizeは1以上の整数で指定してください。")
            if isinstance(overlap, bool) or not isinstance(overlap, int) or overlap < 0 or overlap >= chunk_size:
                raise ValueError(f"chunk_configsの{index}件目のoverlapは0以上chunk_size未満の整数で指定してください。")
            config_ids.add(config_id)
            configs.append({"id": config_id, "label": label, "chunk_size": chunk_size, "overlap": overlap})

        learning_note = data.get("learning_note", {})
        if not isinstance(learning_note, dict):
            raise ValueError("learning_noteはオブジェクトで指定してください。")
        normalized_note = {
            key: str(learning_note.get(key, "")).strip()
            for key in ("observation", "decision", "risk_note")
        }

        comparisons = []
        for config in configs:
            comparisons.append(self._evaluate_chunk_config(document, questions, config))
        recommended = max(
            comparisons,
            key=lambda item: (
                float(item["summary"]["average_expected_term_coverage"]),
                -int(item["summary"]["evidence_split_count"]),
                float(item["summary"]["average_top_score"]),
            ),
        )
        return {
            "document_length": len(document),
            "question_count": len(questions),
            "comparison_count": len(comparisons),
            "comparisons": comparisons,
            "recommendation": {
                "config_id": recommended["config_id"],
                "label": recommended["label"],
                "reason": "期待語句の保持率、根拠の分断数、検索上位スコアの順で比較しました。",
            },
            "learning_note": normalized_note,
            "evaluation_notes": [
                "検索順位は文字単位の簡易類似度、回答は検索1位の文書断片を使うローカル抽出方式です。",
                "同じ文書と固定した質問で分割条件だけを変え、検索順位、根拠の分断、回答範囲を比較します。",
            ],
        }

    def _evaluate_chunk_config(
        self,
        document: str,
        questions: list[dict[str, Any]],
        config: dict[str, Any],
    ) -> dict[str, Any]:
        chunk_size = int(config["chunk_size"])
        overlap = int(config["overlap"])
        step = chunk_size - overlap
        chunks = [
            {
                "index": index + 1,
                "start": start,
                "end": min(start + chunk_size, len(document)),
                "text": document[start : start + chunk_size],
            }
            for index, start in enumerate(range(0, len(document), step))
        ]

        question_results = []
        for question_data in questions:
            question = str(question_data["question"])
            expected_terms = [str(term) for term in question_data["expected_terms"]]
            ranking = sorted(
                [
                    {
                        "rank": 0,
                        "chunk_index": chunk["index"],
                        "score": self._similarity(question, str(chunk["text"])),
                        "text": chunk["text"],
                        "matched_expected_terms": [term for term in expected_terms if term in str(chunk["text"])],
                    }
                    for chunk in chunks
                ],
                key=lambda item: (float(item["score"]), len(item["matched_expected_terms"])),
                reverse=True,
            )
            for rank, item in enumerate(ranking, start=1):
                item["rank"] = rank
            best = ranking[0]
            matched_terms = list(best["matched_expected_terms"])
            all_terms_in_document = all(term in document for term in expected_terms)
            evidence_split = all_terms_in_document and not any(
                all(term in str(chunk["text"]) for term in expected_terms) for chunk in chunks
            )
            question_results.append(
                {
                    "question": question,
                    "expected_terms": expected_terms,
                    "retrieval_results": ranking[:3],
                    "answer": best["text"],
                    "answer_method": "検索1位の文書断片を使うローカル抽出",
                    "matched_expected_terms": matched_terms,
                    "expected_term_coverage": round(len(matched_terms) / len(expected_terms), 3),
                    "evidence_split": evidence_split,
                }
            )

        average_top_score = sum(float(result["retrieval_results"][0]["score"]) for result in question_results) / len(question_results)
        average_coverage = sum(float(result["expected_term_coverage"]) for result in question_results) / len(question_results)
        return {
            "config_id": config["id"],
            "label": config["label"],
            "chunk_size": chunk_size,
            "overlap": overlap,
            "step": step,
            "chunks": chunks,
            "question_results": question_results,
            "summary": {
                "chunk_count": len(chunks),
                "average_chunk_length": round(sum(len(str(chunk["text"])) for chunk in chunks) / len(chunks), 1),
                "average_top_score": round(average_top_score, 3),
                "average_expected_term_coverage": round(average_coverage, 3),
                "evidence_split_count": sum(bool(result["evidence_split"]) for result in question_results),
            },
        }

    def _reranker(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._reranker_conditions(data)
        if conditions["mode"] != "mock":
            raise ValueError("実Embeddingを使う場合は非同期の実行入口を使用してください。")
        started_at = perf_counter()
        semantic_scores = [self._similarity(conditions["query"], document["text"]) for document in conditions["documents"]]
        initial_search_ms = round((perf_counter() - started_at) * 1000, 3)
        return self._reranker_result(conditions, semantic_scores, initial_search_ms, "明示的なモック")

    async def _reranker_async(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._reranker_conditions(data)
        if conditions["mode"] == "mock":
            return self._reranker(conditions)
        started_at = perf_counter()
        embeddings: list[list[float]] = []
        embedding_inputs = [conditions["query"], *[document["text"] for document in conditions["documents"]]]
        for embedding_input in embedding_inputs:
            response = await self._embedding_client.embed([embedding_input])
            if len(response) != 1:
                raise ValueError("Embedding APIから1件の入力に対して1件のベクトルが返されませんでした。")
            embeddings.append(response[0])
        initial_search_ms = round((perf_counter() - started_at) * 1000, 3)
        dimension = len(embeddings[0])
        if dimension == 0 or any(len(vector) != dimension for vector in embeddings):
            raise ValueError("Embedding APIから有効な同一次元のベクトルが返されませんでした。")
        semantic_scores = [
            self._cosine_similarity(embeddings[0], vector)
            for vector in embeddings[1:]
        ]
        result = self._reranker_result(conditions, semantic_scores, initial_search_ms, "実Embedding")
        return {**result, "embedding_model": get_settings().get_embedding_model(), "embedding_dimension": dimension}

    def _reranker_conditions(self, data: dict[str, Any]) -> dict[str, Any]:
        query = str(data.get("query", "")).strip()
        if not query:
            raise ValueError("queryを入力してください。")
        raw_documents = data.get("documents", [])
        if not isinstance(raw_documents, list) or len(raw_documents) < 2 or len(raw_documents) > 20:
            raise ValueError("documentsは2件以上20件以下の配列で指定してください。")
        documents = []
        document_ids: set[str] = set()
        for index, raw_document in enumerate(raw_documents, start=1):
            if not isinstance(raw_document, dict):
                raise ValueError(f"documentsの{index}件目はidとtextを持つオブジェクトで指定してください。")
            document_id = str(raw_document.get("id", "")).strip()
            text = str(raw_document.get("text", "")).strip()
            if not document_id or document_id in document_ids:
                raise ValueError("documentsのidは空でない一意の値を指定してください。")
            if not text:
                raise ValueError(f"documentsの{index}件目にtextを指定してください。")
            document_ids.add(document_id)
            documents.append({"id": document_id, "text": text})

        initial_top_k = data.get("initial_top_k")
        rerank_top_k = data.get("rerank_top_k")
        if isinstance(initial_top_k, bool) or not isinstance(initial_top_k, int) or not 1 <= initial_top_k <= len(documents):
            raise ValueError("initial_top_kは1以上、文書数以下の整数で指定してください。")
        if isinstance(rerank_top_k, bool) or not isinstance(rerank_top_k, int) or not 1 <= rerank_top_k <= initial_top_k:
            raise ValueError("rerank_top_kは1以上、initial_top_k以下の整数で指定してください。")
        correct_document_id = str(data.get("correct_document_id", "")).strip()
        if correct_document_id not in document_ids:
            raise ValueError("correct_document_idはdocumentsに存在するidを指定してください。")
        mode = str(data.get("mode", "model")).strip().lower()
        if mode not in {"model", "mock"}:
            raise ValueError("modeはmodelまたはmockを指定してください。")
        learning_note = data.get("learning_note", {})
        if not isinstance(learning_note, dict):
            raise ValueError("learning_noteはオブジェクトで指定してください。")
        return {
            "query": query,
            "documents": documents,
            "initial_top_k": initial_top_k,
            "rerank_top_k": rerank_top_k,
            "correct_document_id": correct_document_id,
            "mode": mode,
            "learning_note": {
                key: str(learning_note.get(key, "")).strip()
                for key in ("observation", "decision", "risk_note")
            },
        }

    def _reranker_result(
        self,
        conditions: dict[str, Any],
        semantic_scores: list[float],
        initial_search_ms: float,
        search_mode_label: str,
    ) -> dict[str, Any]:
        initial = sorted(
            [
                {"document_id": document["id"], "text": document["text"], "semantic_score": score}
                for document, score in zip(conditions["documents"], semantic_scores, strict=True)
            ],
            key=lambda item: float(item["semantic_score"]),
            reverse=True,
        )
        for rank, item in enumerate(initial, start=1):
            item["initial_rank"] = rank
        candidate_pool = initial[: int(conditions["initial_top_k"])]

        rerank_started_at = perf_counter()
        reranked = []
        for item in candidate_pool:
            lexical_score = self._similarity(conditions["query"], str(item["text"]))
            phrase_bonus = 0.5 if conditions["query"] in str(item["text"]) else 0.0
            reranked.append(
                {
                    **item,
                    "lexical_score": lexical_score,
                    "phrase_bonus": phrase_bonus,
                    "rerank_score": round(float(item["semantic_score"]) * 0.5 + lexical_score * 0.25 + phrase_bonus, 6),
                }
            )
        reranked.sort(key=lambda item: float(item["rerank_score"]), reverse=True)
        for rank, item in enumerate(reranked, start=1):
            item["rerank_rank"] = rank
        rerank_ms = round((perf_counter() - rerank_started_at) * 1000, 3)

        correct_id = conditions["correct_document_id"]
        initial_rank = next(int(item["initial_rank"]) for item in initial if item["document_id"] == correct_id)
        rerank_rank = next((int(item["rerank_rank"]) for item in reranked if item["document_id"] == correct_id), None)
        improvement = initial_rank - rerank_rank if rerank_rank is not None else None
        if rerank_rank is None:
            judgement = "正解文書が初期top-kの候補外であり、Rerankerでは改善できません。"
        elif improvement > 0:
            judgement = "正解文書の順位が改善し、この条件ではRerankerが有効でした。"
        elif improvement == 0:
            judgement = "正解文書の順位は変わらず、追加遅延に見合うかを判断します。"
        else:
            judgement = "正解文書の順位が下がったため、加点規則または候補文書を見直します。"
        return {
            "search_mode": conditions["mode"],
            "search_mode_label": search_mode_label,
            "reranker_method": "意味類似度、文字の重なり、検索文の完全一致を組み合わせるローカル特徴Reranker",
            "query": conditions["query"],
            "initial_top_k": conditions["initial_top_k"],
            "rerank_top_k": conditions["rerank_top_k"],
            "initial_ranking": initial[: int(conditions["initial_top_k"])],
            "reranked_ranking": reranked[: int(conditions["rerank_top_k"])],
            "correct_document": {
                "document_id": correct_id,
                "initial_rank": initial_rank,
                "rerank_rank": rerank_rank,
                "rank_improvement": improvement,
            },
            "latency_summary": {
                "initial_search_ms": initial_search_ms,
                "rerank_ms": rerank_ms,
                "total_ms": round(initial_search_ms + rerank_ms, 3),
            },
            "processing_summary": {
                "embedding_input_count": len(conditions["documents"]) + 1 if conditions["mode"] == "model" else 0,
                "retrieved_document_count": len(initial),
                "reranked_candidate_count": len(candidate_pool),
            },
            "judgement": judgement,
            "learning_note": conditions["learning_note"],
            "notes": [
                "modelはLM StudioのEmbedding APIへ実通信して初期順位を作ります。" if conditions["mode"] == "model" else "mockは画面と比較手順を確認する明示的な模擬検索です。",
                "Rerankerは初期top-kに含まれる候補だけを再評価するため、候補外の正解文書は救済できません。",
            ],
        }

    def _model_compare(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._model_compare_conditions(data)
        if conditions["mode"] != "mock":
            raise ValueError("実モデルで比較する場合は非同期の実行入口を使用してください。")
        runs = []
        for index, profile in enumerate(conditions["models"]):
            answer = profile["mock_response"] or f"{conditions['prompt']}への明示的なモック回答"
            runs.append(
                {
                    "profile": profile,
                    "answer": answer,
                    "response_model": "明示的なモック",
                    "elapsed_ms": float(80 + index * 40),
                    "input_tokens": None,
                    "output_tokens": None,
                }
            )
        return self._model_compare_result(conditions, runs)

    async def _model_compare_async(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._model_compare_conditions(data)
        if conditions["mode"] == "mock":
            return self._model_compare(data)
        runs = []
        for profile in conditions["models"]:
            started_at = perf_counter()
            generated = await self._generation_client.generate_text_with_metadata(
                conditions["prompt"],
                conditions["temperature"],
                model=profile["model"],
            )
            runs.append(
                {
                    "profile": profile,
                    "answer": generated["text"],
                    "response_model": generated["model"],
                    "elapsed_ms": round((perf_counter() - started_at) * 1000, 3),
                    "input_tokens": generated.get("input_tokens"),
                    "output_tokens": generated.get("output_tokens"),
                }
            )
        return self._model_compare_result(conditions, runs)

    @staticmethod
    def _model_compare_conditions(data: dict[str, Any]) -> dict[str, Any]:
        prompt = str(data.get("prompt", "")).strip()
        if not prompt or len(prompt) > 8_000:
            raise ValueError("promptは1文字以上8000文字以内で指定してください。")
        raw_models = data.get("models") or data.get("model_profiles") or []
        if not isinstance(raw_models, list) or len(raw_models) < 2 or len(raw_models) > 5:
            raise ValueError("modelsは比較する2件以上5件以下の配列で指定してください。")
        models = []
        model_ids: set[str] = set()
        model_names: set[str] = set()
        for index, raw_model in enumerate(raw_models, start=1):
            if isinstance(raw_model, str):
                raw_model = {"id": raw_model, "model": raw_model, "label": raw_model}
            if not isinstance(raw_model, dict):
                raise ValueError(f"modelsの{index}件目は文字列またはオブジェクトで指定してください。")
            model_name = str(raw_model.get("model", "")).strip()
            model_id = str(raw_model.get("id", model_name)).strip()
            label = str(raw_model.get("label", model_name)).strip()
            if not model_name or not model_id or not label:
                raise ValueError(f"modelsの{index}件目にid、model、labelを指定してください。")
            if model_id in model_ids or model_name in model_names:
                raise ValueError("modelsのidとmodelはそれぞれ重複しない値を指定してください。")
            try:
                input_price = float(raw_model.get("input_cost_per_million", 0))
                output_price = float(raw_model.get("output_cost_per_million", 0))
            except (TypeError, ValueError) as exc:
                raise ValueError("100万トークン当たりの費用は0以上の数値で指定してください。") from exc
            if input_price < 0 or output_price < 0:
                raise ValueError("100万トークン当たりの費用は0以上の数値で指定してください。")
            model_ids.add(model_id)
            model_names.add(model_name)
            models.append(
                {
                    "id": model_id,
                    "model": model_name,
                    "label": label,
                    "input_cost_per_million": input_price,
                    "output_cost_per_million": output_price,
                    "operational_note": str(raw_model.get("operational_note", "")).strip(),
                    "mock_response": str(raw_model.get("mock_response", "")).strip(),
                }
            )
        raw_rubric = data.get("evaluation_rubric", {})
        if not isinstance(raw_rubric, dict):
            raise ValueError("evaluation_rubricはオブジェクトで指定してください。")
        raw_terms = raw_rubric.get("required_terms", [])
        if not isinstance(raw_terms, list) or not raw_terms or len(raw_terms) > 20:
            raise ValueError("evaluation_rubric.required_termsは1件以上20件以下で指定してください。")
        required_terms = [str(term).strip() for term in raw_terms]
        if any(not term for term in required_terms):
            raise ValueError("evaluation_rubric.required_termsに空文字は指定できません。")
        try:
            max_length = int(raw_rubric.get("max_length", 0))
            coverage_weight = float(raw_rubric.get("coverage_weight", 0.8))
            conciseness_weight = float(raw_rubric.get("conciseness_weight", 0.2))
            temperature = float(data.get("temperature", 0.2))
        except (TypeError, ValueError) as exc:
            raise ValueError("評価基準とTemperatureには数値を指定してください。") from exc
        if max_length < 1 or max_length > 4_000:
            raise ValueError("evaluation_rubric.max_lengthは1以上4000以下で指定してください。")
        if coverage_weight < 0 or conciseness_weight < 0 or not math.isclose(coverage_weight + conciseness_weight, 1.0):
            raise ValueError("coverage_weightとconciseness_weightは0以上で合計1にしてください。")
        if temperature < 0 or temperature > 2:
            raise ValueError("temperatureは0以上2以下で指定してください。")
        priority = str(data.get("priority", "balanced")).strip().lower()
        if priority not in {"quality", "latency", "cost", "balanced"}:
            raise ValueError("priorityはquality、latency、cost、balancedのいずれかを指定してください。")
        mode = str(data.get("mode", "model")).strip().lower()
        if mode not in {"model", "mock"}:
            raise ValueError("modeはmodelまたはmockを指定してください。")
        raw_note = data.get("learning_note", {})
        if not isinstance(raw_note, dict):
            raise ValueError("learning_noteはオブジェクトで指定してください。")
        return {
            "prompt": prompt,
            "models": models,
            "evaluation_rubric": {
                "required_terms": required_terms,
                "max_length": max_length,
                "coverage_weight": coverage_weight,
                "conciseness_weight": conciseness_weight,
            },
            "priority": priority,
            "temperature": temperature,
            "mode": mode,
            "learning_note": {key: str(raw_note.get(key, "")).strip() for key in ("observation", "decision", "risk_note")},
        }

    @staticmethod
    def _model_compare_result(conditions: dict[str, Any], runs: list[dict[str, Any]]) -> dict[str, Any]:
        rubric = conditions["evaluation_rubric"]
        results = []
        for run in runs:
            profile = run["profile"]
            answer = run["answer"]
            matched_terms = [term for term in rubric["required_terms"] if term.casefold() in answer.casefold()]
            coverage_ratio = len(matched_terms) / len(rubric["required_terms"])
            conciseness_score = min(1.0, rubric["max_length"] / max(1, len(answer)))
            quality_score = round(
                (coverage_ratio * rubric["coverage_weight"] + conciseness_score * rubric["conciseness_weight"]) * 100,
                2,
            )
            input_tokens = run["input_tokens"]
            output_tokens = run["output_tokens"]
            estimated_cost = None
            if isinstance(input_tokens, int) and isinstance(output_tokens, int):
                estimated_cost = round(
                    (
                        input_tokens * profile["input_cost_per_million"]
                        + output_tokens * profile["output_cost_per_million"]
                    )
                    / 1_000_000,
                    8,
                )
            results.append(
                {
                    "model_id": profile["id"],
                    "requested_model": profile["model"],
                    "response_model": run["response_model"],
                    "label": profile["label"],
                    "answer": answer,
                    "elapsed_ms": run["elapsed_ms"],
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "estimated_cost": estimated_cost,
                    "quality_score": quality_score,
                    "coverage_ratio": round(coverage_ratio, 3),
                    "matched_terms": matched_terms,
                    "conciseness_score": round(conciseness_score, 3),
                    "operational_note": profile["operational_note"],
                }
            )
        minimum_latency = min(float(row["elapsed_ms"]) for row in results)
        known_costs = [float(row["estimated_cost"]) for row in results if row["estimated_cost"] is not None]
        minimum_cost = min(known_costs) if known_costs else 0.0
        for row in results:
            latency_score = minimum_latency / max(float(row["elapsed_ms"]), 0.001)
            cost = row["estimated_cost"]
            cost_score = 0.0 if cost is None else (1.0 if float(cost) == 0 else minimum_cost / float(cost))
            row["balanced_score"] = round(float(row["quality_score"]) * 0.6 + latency_score * 20 + cost_score * 20, 2)
        selectors = {
            "quality": lambda row: float(row["quality_score"]),
            "latency": lambda row: -float(row["elapsed_ms"]),
            "cost": lambda row: -float("inf") if row["estimated_cost"] is None else -float(row["estimated_cost"]),
            "balanced": lambda row: float(row["balanced_score"]),
        }
        selected = max(results, key=selectors[conditions["priority"]])
        priority_labels = {"quality": "品質", "latency": "応答時間", "cost": "推定費用", "balanced": "総合評価"}
        selected_label = priority_labels[conditions["priority"]]
        rejected = [
            {"model_id": row["model_id"], "reason": f"{selected_label}を優先した評価で採用候補を上回らなかったため。"}
            for row in results
            if row["model_id"] != selected["model_id"]
        ]
        return {
            "comparison_mode": conditions["mode"],
            "comparison_mode_label": "実モデルへの通信" if conditions["mode"] == "model" else "明示的なモック",
            "fixed_conditions": {
                "prompt": conditions["prompt"],
                "temperature": conditions["temperature"],
                "evaluation_rubric": rubric,
            },
            "model_results": results,
            "priority": conditions["priority"],
            "selected_model_id": selected["model_id"],
            "selected_model": selected["requested_model"],
            "selection_reason": f"固定した評価条件で{selected_label}を優先し、最も高い評価になったため。",
            "rejected_models": rejected,
            "learning_note": conditions["learning_note"],
            "notes": [
                "modelは指定したモデル名ごとにOpenAI互換APIへ実通信した結果です。" if conditions["mode"] == "model" else "mockは画面と比較手順を確認する明示的な模擬結果です。",
                "品質点は必須語句の網羅率と回答長から計算する教材用の固定評価であり、人手評価の代わりではありません。",
                "推定費用は入力・出力トークン数とモデル設定の100万トークン当たり単価から計算します。ローカルモデルの単価を0にした場合は0になります。",
            ],
        }

    def _output_control(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._output_control_conditions(data)
        if conditions["mode"] != "mock":
            raise ValueError("実モデルで比較する場合は非同期の実行入口を使用してください。")
        runs = []
        variants = [
            "返品条件を確認し、申請フォームへ注文番号と理由を入力して、案内に従い商品を返送します。未使用で期限内かを事前に確認します。",
            "注文情報を準備し、返品条件と期限を確認したうえで申請します。受付後の案内に沿って梱包し、指定された方法で返送します。",
            "返品前に期限、商品の状態、対象外条件を確認します。次に注文番号を添えて申請し、承認後に追跡可能な方法で返送します。",
        ]
        for max_tokens in conditions["max_tokens_values"]:
            for temperature in conditions["temperatures"]:
                for trial in range(conditions["trial_count"]):
                    variant_index = 0 if temperature <= 0.3 else trial % len(variants)
                    full_text = variants[variant_index]
                    output = full_text[: max_tokens * 4]
                    cutoff = len(output) < len(full_text)
                    runs.append(
                        {
                            "max_tokens": max_tokens,
                            "temperature": temperature,
                            "trial": trial + 1,
                            "output": output,
                            "output_length": len(output),
                            "input_tokens": None,
                            "output_tokens": min(max_tokens, max(1, math.ceil(len(output) / 4))),
                            "finish_reason": "length" if cutoff else "stop",
                            "cutoff": cutoff,
                            "elapsed_ms": float(60 + max_tokens / 2 + trial * 5),
                            "response_model": "明示的なモック",
                        }
                    )
        return self._output_control_result(conditions, runs)

    async def _output_control_async(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._output_control_conditions(data)
        if conditions["mode"] == "mock":
            return self._output_control(data)
        runs = []
        for max_tokens in conditions["max_tokens_values"]:
            for temperature in conditions["temperatures"]:
                for trial in range(conditions["trial_count"]):
                    started_at = perf_counter()
                    generated = await self._generation_client.generate_text_with_metadata(
                        conditions["prompt"],
                        temperature,
                        model=conditions["model"],
                        max_tokens=max_tokens,
                    )
                    finish_reason = generated.get("finish_reason")
                    runs.append(
                        {
                            "max_tokens": max_tokens,
                            "temperature": temperature,
                            "trial": trial + 1,
                            "output": generated["text"],
                            "output_length": len(generated["text"]),
                            "input_tokens": generated.get("input_tokens"),
                            "output_tokens": generated.get("output_tokens"),
                            "finish_reason": finish_reason,
                            "cutoff": finish_reason == "length",
                            "elapsed_ms": round((perf_counter() - started_at) * 1000, 3),
                            "response_model": generated["model"],
                        }
                    )
        return self._output_control_result(conditions, runs)

    @staticmethod
    def _output_control_conditions(data: dict[str, Any]) -> dict[str, Any]:
        prompt = str(data.get("prompt", "")).strip()
        if not prompt or len(prompt) > 8_000:
            raise ValueError("promptは1文字以上8000文字以内で指定してください。")
        model = str(data.get("model", "")).strip()
        if not model:
            raise ValueError("modelを指定してください。")
        raw_limits = data.get("max_tokens_values", [])
        if not isinstance(raw_limits, list) or not raw_limits or len(raw_limits) > 5:
            raise ValueError("max_tokens_valuesは1件以上5件以下の配列で指定してください。")
        limits = []
        for value in raw_limits:
            if isinstance(value, bool) or not isinstance(value, int) or value < 1 or value > 4_096:
                raise ValueError("max_tokens_valuesは1以上4096以下の整数で指定してください。")
            limits.append(value)
        if len(set(limits)) != len(limits):
            raise ValueError("max_tokens_valuesに重複しない値を指定してください。")
        raw_temperatures = data.get("temperatures", [])
        if not isinstance(raw_temperatures, list) or not raw_temperatures or len(raw_temperatures) > 5:
            raise ValueError("temperaturesは1件以上5件以下の配列で指定してください。")
        try:
            temperatures = [float(value) for value in raw_temperatures]
        except (TypeError, ValueError) as exc:
            raise ValueError("temperaturesは数値の配列で指定してください。") from exc
        if any(value < 0 or value > 2 for value in temperatures) or len(set(temperatures)) != len(temperatures):
            raise ValueError("temperaturesは0以上2以下の重複しない値を指定してください。")
        try:
            trial_count = int(data.get("trial_count", 0))
        except (TypeError, ValueError) as exc:
            raise ValueError("trial_countは1以上5以下の整数で指定してください。") from exc
        if trial_count < 1 or trial_count > 5 or (isinstance(data.get("trial_count"), float) and not float(data["trial_count"]).is_integer()):
            raise ValueError("trial_countは1以上5以下の整数で指定してください。")
        mode = str(data.get("mode", "model")).strip().lower()
        if mode not in {"model", "mock"}:
            raise ValueError("modeはmodelまたはmockを指定してください。")
        raw_note = data.get("learning_note", {})
        if not isinstance(raw_note, dict):
            raise ValueError("learning_noteはオブジェクトで指定してください。")
        return {
            "prompt": prompt,
            "model": model,
            "max_tokens_values": limits,
            "temperatures": temperatures,
            "trial_count": trial_count,
            "mode": mode,
            "learning_note": {key: str(raw_note.get(key, "")).strip() for key in ("observation", "decision", "risk_note")},
        }

    @staticmethod
    def _output_control_result(conditions: dict[str, Any], runs: list[dict[str, Any]]) -> dict[str, Any]:
        summaries = []
        for max_tokens in conditions["max_tokens_values"]:
            for temperature in conditions["temperatures"]:
                matching = [run for run in runs if run["max_tokens"] == max_tokens and run["temperature"] == temperature]
                known_output_tokens = [run["output_tokens"] for run in matching if isinstance(run["output_tokens"], int)]
                summaries.append(
                    {
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                        "trial_count": len(matching),
                        "cutoff_count": sum(1 for run in matching if run["cutoff"]),
                        "cutoff_rate": round(sum(1 for run in matching if run["cutoff"]) / len(matching), 3),
                        "unique_output_count": len({run["output"] for run in matching}),
                        "average_output_length": round(sum(run["output_length"] for run in matching) / len(matching), 1),
                        "average_output_tokens": round(sum(known_output_tokens) / len(known_output_tokens), 1) if known_output_tokens else None,
                        "average_elapsed_ms": round(sum(float(run["elapsed_ms"]) for run in matching) / len(matching), 3),
                    }
                )
        complete = [summary for summary in summaries if summary["cutoff_count"] == 0]
        recommended = min(
            complete or summaries,
            key=lambda row: (
                row["cutoff_rate"],
                float("inf") if row["average_output_tokens"] is None else row["average_output_tokens"],
                row["average_elapsed_ms"],
            ),
        )
        recommendation_reason = (
            "途中切れがない条件を優先し、その中で出力トークン数と応答時間が小さい設定を候補にしました。"
            if complete
            else "すべての条件で途中切れが発生したため、途中切れ率、出力トークン数、応答時間が小さい設定を暫定候補にしました。出力上限を増やして再比較してください。"
        )
        return {
            "generation_mode": conditions["mode"],
            "generation_mode_label": "実モデルへの通信" if conditions["mode"] == "model" else "明示的なモック",
            "fixed_conditions": {
                "prompt": conditions["prompt"],
                "model": conditions["model"],
                "trial_count": conditions["trial_count"],
            },
            "matrix_results": runs,
            "setting_summaries": summaries,
            "recommendation": {
                "max_tokens": recommended["max_tokens"],
                "temperature": recommended["temperature"],
                "reason": recommendation_reason,
            },
            "learning_note": conditions["learning_note"],
            "notes": [
                "modelは指定したモデルへmax_tokensとTemperatureを組み合わせて実通信した結果です。" if conditions["mode"] == "model" else "mockは画面と比較手順を確認する明示的な模擬結果です。",
                "途中切れはOpenAI互換APIのfinish_reasonがlengthだった場合に判定します。",
                "Temperatureのばらつきは同じ設定を複数回実行した回答の異なり方で確認します。",
                "長い出力上限は途中切れを減らしますが、出力トークン数、応答時間、費用が増える可能性があります。",
            ],
        }

    def _quantization(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._quantization_conditions(data)
        if conditions["mode"] != "mock":
            raise ValueError("実モデルで比較する場合は非同期の実行入口を使用してください。")
        runs = []
        for profile in conditions["quantization_profiles"]:
            runs.append(
                {
                    "profile": profile,
                    "answer": profile["mock_response"] or f"{conditions['prompt']}への明示的なモック回答",
                    "response_model": "明示的なモック",
                    "elapsed_ms": profile["mock_elapsed_ms"],
                    "input_tokens": None,
                    "output_tokens": None,
                }
            )
        return self._quantization_result(conditions, runs)

    async def _quantization_async(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._quantization_conditions(data)
        if conditions["mode"] == "mock":
            return self._quantization(data)
        runs = []
        for profile in conditions["quantization_profiles"]:
            started_at = perf_counter()
            generated = await self._generation_client.generate_text_with_metadata(
                conditions["prompt"],
                conditions["temperature"],
                model=profile["model"],
            )
            runs.append(
                {
                    "profile": profile,
                    "answer": generated["text"],
                    "response_model": generated["model"],
                    "elapsed_ms": round((perf_counter() - started_at) * 1000, 3),
                    "input_tokens": generated.get("input_tokens"),
                    "output_tokens": generated.get("output_tokens"),
                }
            )
        return self._quantization_result(conditions, runs)

    @staticmethod
    def _quantization_conditions(data: dict[str, Any]) -> dict[str, Any]:
        prompt = str(data.get("prompt", "")).strip()
        if not prompt or len(prompt) > 8_000:
            raise ValueError("promptは1文字以上8000文字以内で指定してください。")
        mode = str(data.get("mode", "mock")).strip().lower()
        if mode not in {"model", "mock"}:
            raise ValueError("modeはmodelまたはmockを指定してください。")
        raw_profiles = data.get("quantization_profiles") or data.get("profiles") or []
        if not isinstance(raw_profiles, list) or not raw_profiles or len(raw_profiles) > 5:
            raise ValueError("quantization_profilesは1件以上5件以下の配列で指定してください。")
        raw_metrics = data.get("runtime_metrics", [])
        if not isinstance(raw_metrics, list):
            raise ValueError("runtime_metricsは配列で指定してください。")
        metrics_by_id: dict[str, dict[str, Any]] = {}
        for index, raw_metric in enumerate(raw_metrics, start=1):
            if not isinstance(raw_metric, dict):
                raise ValueError(f"runtime_metricsの{index}件目はオブジェクトで指定してください。")
            profile_id = str(raw_metric.get("profile_id", "")).strip()
            if not profile_id or profile_id in metrics_by_id:
                raise ValueError("runtime_metricsのprofile_idは空でない重複しない値を指定してください。")
            metrics_by_id[profile_id] = raw_metric
        profiles = []
        profile_ids: set[str] = set()
        model_names: set[str] = set()
        for index, raw_profile in enumerate(raw_profiles, start=1):
            if not isinstance(raw_profile, dict):
                raise ValueError(f"quantization_profilesの{index}件目はオブジェクトで指定してください。")
            model = str(raw_profile.get("model", "")).strip()
            profile_id = str(raw_profile.get("id", "")).strip()
            label = str(raw_profile.get("label", profile_id)).strip()
            quantization = str(raw_profile.get("quantization", label)).strip()
            if not model or not profile_id or not label or not quantization:
                raise ValueError(f"quantization_profilesの{index}件目にid、model、label、quantizationを指定してください。")
            if profile_id in profile_ids or model in model_names:
                raise ValueError("quantization_profilesのidとmodelはそれぞれ重複しない値を指定してください。")
            metric = metrics_by_id.get(profile_id)
            if metric is None:
                raise ValueError(f"runtime_metricsに{profile_id}の測定条件を指定してください。")
            try:
                memory_mb = float(metric.get("memory_mb", 0))
                mock_elapsed_ms = float(metric.get("mock_elapsed_ms", 0))
            except (TypeError, ValueError) as exc:
                raise ValueError("memory_mbとmock_elapsed_msには数値を指定してください。") from exc
            if memory_mb <= 0:
                raise ValueError("runtime_metrics.memory_mbは0より大きい値を指定してください。")
            if mode == "mock" and mock_elapsed_ms <= 0:
                raise ValueError("mockではruntime_metrics.mock_elapsed_msに0より大きい値を指定してください。")
            profile_ids.add(profile_id)
            model_names.add(model)
            profiles.append(
                {
                    "id": profile_id,
                    "model": model,
                    "label": label,
                    "quantization": quantization,
                    "memory_mb": memory_mb,
                    "environment_note": str(metric.get("environment_note", "")).strip(),
                    "mock_elapsed_ms": mock_elapsed_ms,
                    "mock_response": str(raw_profile.get("mock_response", "")).strip(),
                }
            )
        unknown_metric_ids = set(metrics_by_id) - profile_ids
        if unknown_metric_ids:
            raise ValueError(f"runtime_metricsに未定義のprofile_idがあります: {', '.join(sorted(unknown_metric_ids))}")
        raw_rubric = data.get("evaluation_rubric", {})
        if not isinstance(raw_rubric, dict):
            raise ValueError("evaluation_rubricはオブジェクトで指定してください。")
        raw_terms = raw_rubric.get("required_terms", [])
        if not isinstance(raw_terms, list) or not raw_terms or len(raw_terms) > 20:
            raise ValueError("evaluation_rubric.required_termsは1件以上20件以下で指定してください。")
        required_terms = [str(term).strip() for term in raw_terms]
        if any(not term for term in required_terms):
            raise ValueError("evaluation_rubric.required_termsに空文字は指定できません。")
        try:
            max_length = int(raw_rubric.get("max_length", 0))
            coverage_weight = float(raw_rubric.get("coverage_weight", 0.8))
            conciseness_weight = float(raw_rubric.get("conciseness_weight", 0.2))
            temperature = float(data.get("temperature", 0.2))
        except (TypeError, ValueError) as exc:
            raise ValueError("評価基準とTemperatureには数値を指定してください。") from exc
        if max_length < 1 or max_length > 4_000:
            raise ValueError("evaluation_rubric.max_lengthは1以上4000以下で指定してください。")
        if coverage_weight < 0 or conciseness_weight < 0 or not math.isclose(coverage_weight + conciseness_weight, 1.0):
            raise ValueError("coverage_weightとconciseness_weightは0以上で合計1にしてください。")
        if temperature < 0 or temperature > 2:
            raise ValueError("temperatureは0以上2以下で指定してください。")
        priority = str(data.get("selection_priority", "balanced")).strip().lower()
        if priority not in {"memory", "speed", "quality", "balanced"}:
            raise ValueError("selection_priorityはmemory、speed、quality、balancedのいずれかを指定してください。")
        raw_note = data.get("learning_note", {})
        if not isinstance(raw_note, dict):
            raise ValueError("learning_noteはオブジェクトで指定してください。")
        return {
            "prompt": prompt,
            "quantization_profiles": profiles,
            "evaluation_rubric": {
                "required_terms": required_terms,
                "max_length": max_length,
                "coverage_weight": coverage_weight,
                "conciseness_weight": conciseness_weight,
            },
            "selection_priority": priority,
            "temperature": temperature,
            "mode": mode,
            "learning_note": {key: str(raw_note.get(key, "")).strip() for key in ("observation", "decision", "risk_note")},
        }

    @staticmethod
    def _quantization_result(conditions: dict[str, Any], runs: list[dict[str, Any]]) -> dict[str, Any]:
        rubric = conditions["evaluation_rubric"]
        results = []
        for run in runs:
            profile = run["profile"]
            answer = run["answer"]
            matched_terms = [term for term in rubric["required_terms"] if term.casefold() in answer.casefold()]
            coverage_ratio = len(matched_terms) / len(rubric["required_terms"])
            conciseness_score = min(1.0, rubric["max_length"] / max(1, len(answer)))
            quality_score = round(
                (coverage_ratio * rubric["coverage_weight"] + conciseness_score * rubric["conciseness_weight"]) * 100,
                2,
            )
            results.append(
                {
                    "profile_id": profile["id"],
                    "label": profile["label"],
                    "quantization": profile["quantization"],
                    "requested_model": profile["model"],
                    "response_model": run["response_model"],
                    "memory_mb": profile["memory_mb"],
                    "elapsed_ms": run["elapsed_ms"],
                    "input_tokens": run["input_tokens"],
                    "output_tokens": run["output_tokens"],
                    "answer": answer,
                    "quality_score": quality_score,
                    "coverage_ratio": round(coverage_ratio, 3),
                    "matched_terms": matched_terms,
                    "environment_note": profile["environment_note"],
                }
            )
        minimum_memory = min(float(row["memory_mb"]) for row in results)
        minimum_elapsed = min(float(row["elapsed_ms"]) for row in results)
        for row in results:
            row["memory_score"] = round(minimum_memory / float(row["memory_mb"]) * 100, 2)
            row["speed_score"] = round(minimum_elapsed / max(float(row["elapsed_ms"]), 0.001) * 100, 2)
            row["balanced_score"] = round(
                float(row["quality_score"]) * 0.5 + float(row["memory_score"]) * 0.25 + float(row["speed_score"]) * 0.25,
                2,
            )
        selectors = {
            "memory": lambda row: -float(row["memory_mb"]),
            "speed": lambda row: -float(row["elapsed_ms"]),
            "quality": lambda row: float(row["quality_score"]),
            "balanced": lambda row: float(row["balanced_score"]),
        }
        selected = max(results, key=selectors[conditions["selection_priority"]])
        priority_labels = {"memory": "メモリ使用量", "speed": "応答時間", "quality": "品質点", "balanced": "総合点"}
        priority_label = priority_labels[conditions["selection_priority"]]
        fastest = min(results, key=lambda row: float(row["elapsed_ms"]))
        lowest_memory = min(results, key=lambda row: float(row["memory_mb"]))
        highest_quality = max(results, key=lambda row: float(row["quality_score"]))
        return {
            "comparison_mode": conditions["mode"],
            "comparison_mode_label": "実モデルへの通信" if conditions["mode"] == "model" else "明示的なモック",
            "fixed_conditions": {
                "prompt": conditions["prompt"],
                "temperature": conditions["temperature"],
                "evaluation_rubric": rubric,
            },
            "profile_results": results,
            "selection_priority": conditions["selection_priority"],
            "selected_profile_id": selected["profile_id"],
            "selected_profile": selected["label"],
            "selection_reason": f"同じ指示と評価条件で{priority_label}を優先し、最も高い評価になったため。",
            "runtime_summary": {
                "lowest_memory_profile": lowest_memory["label"],
                "fastest_profile": fastest["label"],
                "highest_quality_profile": highest_quality["label"],
            },
            "tradeoff_note": (
                f"メモリ使用量は{lowest_memory['label']}、応答時間は{fastest['label']}、品質点は{highest_quality['label']}が最良でした。"
                "用途で優先する条件を決め、単一指標だけで採用しないでください。"
            ),
            "learning_note": conditions["learning_note"],
            "notes": [
                "modelは量子化プロファイルごとに指定したモデル名でOpenAI互換APIへ実通信します。" if conditions["mode"] == "model" else "mockは画面と比較手順を確認する明示的な模擬結果です。",
                "メモリ使用量はLM Studio等で確認してruntime_metricsへ入力した値です。OpenAI互換APIの応答から自動取得した値ではありません。",
                "品質点は固定した必須語句の網羅率と回答長から計算する教材用の評価であり、人手評価の代わりではありません。",
                "量子化以外の条件差を減らすため、同じ基本モデル、指示、Temperature、実行環境で比較してください。",
            ],
        }

    def _vlm(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._vlm_conditions(data)
        if conditions["mode"] != "mock":
            raise ValueError("modelを指定した場合は非同期の実行入口を使用してください。")
        runs = []
        for variant in conditions["image_variants"]:
            image = self._prepare_vlm_image(conditions["sample_image"], variant)
            answer = conditions["mock_responses"].get(variant["id"], "")
            runs.append(
                self._vlm_variant_result(
                    variant, image, answer, conditions["expected_points"], "明示的なモック",
                    None, None, None, [], [],
                )
            )
        return self._vlm_result(conditions, runs)

    async def _vlm_async(self, data: dict[str, Any]) -> dict[str, Any]:
        conditions = self._vlm_conditions(data)
        if conditions["mode"] == "mock":
            return self._vlm(data)

        runs = []
        system_prompt = (
            "あなたは画像読取結果を評価するVLMです。画像内の文字と図だけを根拠にしてください。"
            "JSONだけを返し、answerには日本語の回答、observed_pointsには読み取れた要点の配列、"
            "omissionsには読み取れなかった可能性がある要点の配列を入れてください。"
        )
        expected_text = "、".join(conditions["expected_points"])
        user_prompt = (
            f"{conditions['task_prompt']}\n"
            f"評価時に照合する要点は「{expected_text}」です。画像から確認できない内容は推測しないでください。"
        )
        for variant in conditions["image_variants"]:
            image = self._prepare_vlm_image(conditions["sample_image"], variant)
            started_at = perf_counter()
            extraction = await self._vlm_client.extract_json_with_metadata(
                system_prompt,
                user_prompt,
                [image["data_url"]],
                model=conditions["model"],
            )
            elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
            answer = str(extraction.data.get("answer", "")).strip()
            if not answer:
                raise ValueError(f"{variant['label']}のVLM応答にanswerがありません。")
            observed_points = [str(item) for item in extraction.data.get("observed_points", [])]
            model_omissions = [str(item) for item in extraction.data.get("omissions", [])]
            runs.append(
                self._vlm_variant_result(
                    variant,
                    image,
                    answer,
                    conditions["expected_points"],
                    extraction.response_model or conditions["model"],
                    elapsed_ms,
                    extraction.input_tokens,
                    extraction.output_tokens,
                    observed_points,
                    model_omissions,
                )
            )
        return self._vlm_result(conditions, runs)

    @staticmethod
    def _vlm_conditions(data: dict[str, Any]) -> dict[str, Any]:
        mode = str(data.get("mode", "mock")).strip().lower()
        if mode not in {"model", "mock"}:
            raise ValueError("modeはmodelまたはmockを指定してください。")
        task_prompt = str(data.get("task_prompt", "")).strip()
        if not task_prompt:
            raise ValueError("task_promptを入力してください。")
        model = str(data.get("model", "")).strip()
        if mode == "model" and not model:
            raise ValueError("modelを入力してください。")

        raw_sample = data.get("sample_image", {})
        if not isinstance(raw_sample, dict):
            raise ValueError("sample_imageはtitleとlinesを持つオブジェクトで指定してください。")
        sample_title = str(raw_sample.get("title", "")).strip()
        sample_lines = [str(item).strip() for item in raw_sample.get("lines", [])]
        if not sample_title or not sample_lines or any(not line for line in sample_lines):
            raise ValueError("sample_imageには空でないtitleとlinesを指定してください。")

        raw_variants = data.get("image_variants", [])
        if not isinstance(raw_variants, list) or not 2 <= len(raw_variants) <= 6:
            raise ValueError("image_variantsは2件以上6件以下で指定してください。")
        variants = []
        variant_ids: set[str] = set()
        for index, raw_variant in enumerate(raw_variants, start=1):
            if not isinstance(raw_variant, dict):
                raise ValueError("image_variantsの各要素はオブジェクトで指定してください。")
            variant_id = str(raw_variant.get("id", f"variant-{index}")).strip()
            if not variant_id or variant_id in variant_ids:
                raise ValueError("image_variantsのidは空でない一意の値を指定してください。")
            variant_ids.add(variant_id)
            width = int(raw_variant.get("width", 320))
            jpeg_quality = int(raw_variant.get("jpeg_quality", 75))
            if not 160 <= width <= 1600:
                raise ValueError("画像のwidthは160以上1600以下で指定してください。")
            if not 20 <= jpeg_quality <= 100:
                raise ValueError("jpeg_qualityは20以上100以下で指定してください。")
            variants.append(
                {
                    "id": variant_id,
                    "label": str(raw_variant.get("label", variant_id)).strip() or variant_id,
                    "width": width,
                    "jpeg_quality": jpeg_quality,
                }
            )

        expected_points = [str(item).strip() for item in data.get("expected_points", [])]
        if not expected_points or any(not point for point in expected_points):
            raise ValueError("expected_pointsには空でない確認要点を1件以上指定してください。")
        raw_mock_responses = data.get("mock_responses", {})
        if not isinstance(raw_mock_responses, dict):
            raise ValueError("mock_responsesは画像IDをキーにしたオブジェクトで指定してください。")
        mock_responses = {str(key): str(value).strip() for key, value in raw_mock_responses.items()}
        if mode == "mock" and any(not mock_responses.get(variant["id"]) for variant in variants):
            raise ValueError("mockでは全画像IDに対応するmock_responsesを指定してください。")

        raw_note = data.get("learning_note", {})
        learning_note = dict(raw_note) if isinstance(raw_note, dict) else {}
        return {
            "mode": mode,
            "model": model,
            "task_prompt": task_prompt,
            "sample_image": {"title": sample_title, "lines": sample_lines},
            "image_variants": variants,
            "expected_points": expected_points,
            "mock_responses": mock_responses,
            "learning_note": learning_note,
        }

    @staticmethod
    def _prepare_vlm_image(sample_image: dict[str, Any], variant: dict[str, Any]) -> dict[str, Any]:
        source_width = 1280
        source_height = 720
        source = Image.new("RGB", (source_width, source_height), "#f8fafc")
        draw = ImageDraw.Draw(source)
        title_font = ImageFont.load_default(size=58)
        body_font = ImageFont.load_default(size=42)
        draw.rounded_rectangle((70, 60, 1210, 660), radius=28, fill="#ffffff", outline="#334155", width=5)
        draw.text((125, 105), str(sample_image["title"]), fill="#0f172a", font=title_font)
        draw.line((125, 190, 1155, 190), fill="#94a3b8", width=4)
        for index, line in enumerate(sample_image["lines"]):
            draw.text((145, 245 + index * 105), str(line), fill="#1e293b", font=body_font)

        width = int(variant["width"])
        height = round(source_height * width / source_width)
        resized = source.resize((width, height), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        resized.save(buffer, format="JPEG", quality=int(variant["jpeg_quality"]), optimize=True)
        image_bytes = buffer.getvalue()
        return {
            "width": width,
            "height": height,
            "byte_size": len(image_bytes),
            "data_url": f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode('ascii')}",
        }

    @staticmethod
    def _vlm_variant_result(
        variant: dict[str, Any],
        image: dict[str, Any],
        answer: str,
        expected_points: list[str],
        response_model: str,
        elapsed_ms: float | None,
        input_tokens: int | None,
        output_tokens: int | None,
        model_points: list[str],
        reported_omissions: list[str],
    ) -> dict[str, Any]:
        evaluation_text = f"{answer} {' '.join(model_points)}".casefold()
        matched_points = [point for point in expected_points if point.casefold() in evaluation_text]
        missed_points = [point for point in expected_points if point not in matched_points]
        accuracy = round(len(matched_points) / len(expected_points), 3)
        return {
            "id": variant["id"],
            "label": variant["label"],
            "width": image["width"],
            "height": image["height"],
            "jpeg_quality": variant["jpeg_quality"],
            "byte_size": image["byte_size"],
            "image_data_url": image["data_url"],
            "answer": answer,
            "response_model": response_model,
            "accuracy": accuracy,
            "matched_points": matched_points,
            "missed_points": missed_points,
            "reported_omissions": reported_omissions,
            "omission_count": len(missed_points),
            "elapsed_ms": elapsed_ms,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
        }

    @staticmethod
    def _vlm_result(conditions: dict[str, Any], runs: list[dict[str, Any]]) -> dict[str, Any]:
        best_accuracy = max(float(run["accuracy"]) for run in runs)
        candidates = [run for run in runs if float(run["accuracy"]) == best_accuracy]
        recommended = min(candidates, key=lambda run: int(run["byte_size"]))
        return {
            "comparison_mode": conditions["mode"],
            "comparison_mode_label": "実VLMへの画像送信" if conditions["mode"] == "model" else "明示的なモック",
            "fixed_conditions": {
                "task_prompt": conditions["task_prompt"],
                "sample_image": conditions["sample_image"],
                "expected_points": conditions["expected_points"],
                "model": conditions["model"] if conditions["mode"] == "model" else "明示的なモック",
            },
            "variant_results": runs,
            "recommended_variant_id": recommended["id"],
            "recommended_variant": recommended["label"],
            "recommendation_note": (
                f"要点網羅率が最高の画像のうち、データ量が最小の{recommended['label']}を候補にしました。"
                "実運用では複数画像と人手確認でも再評価してください。"
            ),
            "learning_note": conditions["learning_note"],
            "notes": [
                "modelは生成した同一画像をサイズ・JPEG品質別に変換し、各画像をOpenAI互換VLM APIへ送信します。"
                if conditions["mode"] == "model"
                else "mockは同じ画像変換を行いますが、VLMへは送信せず、入力した模擬回答を採点します。",
                "要点網羅率は回答とVLMの要点配列に期待語句が含まれるかで計算する教材用の指標です。",
                "画像サイズだけでなくJPEG品質も変わるため、どちらの影響かを分ける場合は片方を固定してください。",
            ],
        }

    def _ocr_normalize(self, data: dict[str, Any]) -> dict[str, Any]:
        text = str(data.get("ocr_text", ""))
        if not text.strip():
            raise ValueError("ocr_textを入力してください。")
        raw_rules = data.get("rules", [])
        if not isinstance(raw_rules, list) or not raw_rules:
            raise ValueError("rulesは1件以上の文字列配列で指定してください。")
        rules = [str(rule).strip() for rule in raw_rules]
        allowed_rules = {"space", "zenkaku", "dictionary", "ocr_o_zero"}
        unknown_rules = sorted(set(rules) - allowed_rules)
        if unknown_rules:
            raise ValueError(f"未対応の正規化規則があります: {', '.join(unknown_rules)}")
        if len(set(rules)) != len(rules):
            raise ValueError("rulesに同じ規則を重複して指定できません。")
        raw_dictionary = data.get("correction_dictionary", {})
        if not isinstance(raw_dictionary, dict):
            raise ValueError("correction_dictionaryは置換前と置換後を持つオブジェクトで指定してください。")
        if len(raw_dictionary) > 50:
            raise ValueError("correction_dictionaryは50件以下で指定してください。")
        correction_dictionary = {
            str(source): str(replacement)
            for source, replacement in raw_dictionary.items()
        }
        if any(not source or not replacement for source, replacement in correction_dictionary.items()):
            raise ValueError("correction_dictionaryに空の置換前・置換後文字列は指定できません。")
        if "dictionary" in rules and not correction_dictionary:
            raise ValueError("dictionary規則を使う場合はcorrection_dictionaryを1件以上指定してください。")

        normalized = text
        diffs: list[dict[str, Any]] = []
        applied_rules: list[str] = []
        review_flags: list[str] = []
        rule_labels = {
            "space": "空白の統一",
            "zenkaku": "全角半角の統一",
            "dictionary": "誤認識辞書による補正",
            "ocr_o_zero": "数字に隣接する英字Oの補正",
        }

        def append_diff(
            rule_id: str,
            before: str,
            after: str,
            confidence: str,
            review_required: bool,
            review_note: str,
        ) -> None:
            change_count = sum(
                1
                for tag, _left_start, _left_end, _right_start, _right_end
                in SequenceMatcher(None, before, after).get_opcodes()
                if tag != "equal"
            )
            diffs.append({
                "rule_id": rule_id,
                "rule": rule_labels[rule_id],
                "before": before,
                "after": after,
                "change_count": change_count,
                "confidence": confidence,
                "review_required": review_required,
                "review_note": review_note,
            })

        for rule in rules:
            before = normalized
            if rule == "space":
                normalized = "\n".join(
                    re.sub(r"[ \t　]+", " ", line).strip()
                    for line in normalized.splitlines()
                )
            elif rule == "zenkaku":
                normalized = unicodedata.normalize("NFKC", normalized)
            elif rule == "dictionary":
                for source, replacement in correction_dictionary.items():
                    normalized = normalized.replace(source, replacement)
            elif rule == "ocr_o_zero":
                normalized = re.sub(r"(?:(?<=\d)[Oo]|[Oo](?=\d))", "0", normalized)
                if before != normalized:
                    review_flags.append("数字に隣接する英字Oを数字0へ補正した箇所は、OCR元画像と照合してください。")
            if before != normalized:
                applied_rules.append(rule_labels[rule])
                if rule == "ocr_o_zero":
                    append_diff(rule, before, normalized, "中", True, "文字の意味は文脈だけで確定できないため、OCR元画像との照合が必要です。")
                elif rule == "dictionary":
                    append_diff(rule, before, normalized, "高", False, "利用者が明示した誤認識辞書との完全一致だけを補正しました。")
                else:
                    append_diff(rule, before, normalized, "高", False, "表記形式だけを統一し、単語の意味は変更していません。")

        return {
            "original_text": text,
            "normalized_text": normalized,
            "selected_rules": rules,
            "correction_dictionary": correction_dictionary,
            "applied_rules": applied_rules,
            "diffs": diffs,
            "review_flags": review_flags,
            "review_status": "要確認" if review_flags else "自動補正のみ",
            "confidence_notes": [
                {"confidence": "高", "target": "空白・全角半角・明示した誤認識辞書", "handling": "差分を確認して利用できます。"},
                {"confidence": "中", "target": "数字に隣接する英字O", "handling": "OCR元画像と照合して確定します。"},
            ],
        }

    def _metadata(self, data: dict[str, Any]) -> dict[str, Any]:
        document = str(data.get("document", "")).strip()
        if not document:
            raise ValueError("documentを入力してください。")

        metadata_value = data.get("metadata")
        if not isinstance(metadata_value, dict):
            raise ValueError("metadataはJSONオブジェクトで指定してください。")
        metadata = dict(metadata_value)
        required_fields = ("source", "page", "section", "permission", "updated_at")
        missing_fields = [field for field in required_fields if metadata.get(field) in (None, "")]
        if missing_fields:
            raise ValueError(f"metadataに必須項目がありません: {', '.join(missing_fields)}")
        for field in ("source", "section", "permission", "updated_at"):
            if not isinstance(metadata[field], str) or not metadata[field].strip():
                raise ValueError(f"metadata.{field}は空でない文字列で指定してください。")
        if isinstance(metadata["page"], bool) or not isinstance(metadata["page"], int) or metadata["page"] <= 0:
            raise ValueError("metadata.pageは1以上の整数で指定してください。")
        if metadata["permission"] not in {"public", "internal", "restricted"}:
            raise ValueError("metadata.permissionはpublic、internal、restrictedのいずれかで指定してください。")

        def parse_timestamp(value: Any, field_name: str) -> datetime:
            try:
                parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            except ValueError as exc:
                raise ValueError(f"{field_name}はISO 8601形式で指定してください。") from exc
            return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=timezone.utc)

        updated_at = parse_timestamp(metadata["updated_at"], "metadata.updated_at")
        filter_value = data.get("metadata_filter", {})
        if not isinstance(filter_value, dict):
            raise ValueError("metadata_filterはJSONオブジェクトで指定してください。")
        metadata_filter = dict(filter_value)
        allowed_filter_fields = {"source", "page", "section", "permission", "updated_after"}
        unknown_filter_fields = sorted(set(metadata_filter) - allowed_filter_fields)
        if unknown_filter_fields:
            raise ValueError(f"metadata_filterに未対応の項目があります: {', '.join(unknown_filter_fields)}")
        for field in ("source", "section", "permission"):
            if field in metadata_filter and (
                not isinstance(metadata_filter[field], str) or not metadata_filter[field].strip()
            ):
                raise ValueError(f"metadata_filter.{field}は空でない文字列で指定してください。")
        if "page" in metadata_filter and (
            isinstance(metadata_filter["page"], bool)
            or not isinstance(metadata_filter["page"], int)
            or metadata_filter["page"] <= 0
        ):
            raise ValueError("metadata_filter.pageは1以上の整数で指定してください。")

        learning_note_value = data.get("learning_note", {})
        if not isinstance(learning_note_value, dict):
            raise ValueError("learning_noteはJSONオブジェクトで指定してください。")
        learning_note = dict(learning_note_value)

        rejected_reasons: list[str] = []
        for field in ("source", "page", "section", "permission"):
            if field in metadata_filter and metadata_filter[field] != metadata[field]:
                rejected_reasons.append(f"{field}が指定値と一致しません。")
        if "updated_after" in metadata_filter:
            updated_after = parse_timestamp(metadata_filter["updated_after"], "metadata_filter.updated_after")
            if updated_at < updated_after:
                rejected_reasons.append("updated_atが指定した更新日時より前です。")

        query = str(data.get("query", "")).strip()
        if not query:
            raise ValueError("queryを入力してください。")
        query_matches = query.casefold() in document.casefold()
        if not query_matches:
            rejected_reasons.append("文書に検索語が含まれていません。")

        chunk_id = self._run_id("chunk", {"document": document, "metadata": metadata})
        citation = f"{metadata['source']} / {metadata['page']}ページ / {metadata['section']}"
        chunk = {"chunk_id": chunk_id, "text": document, "metadata": metadata}
        matched = not rejected_reasons
        search_results = [
            {
                "chunk_id": chunk_id,
                "text": document,
                "score": 1.0,
                "citation": citation,
                "source": metadata["source"],
                "page": metadata["page"],
                "section": metadata["section"],
                "permission": metadata["permission"],
                "updated_at": metadata["updated_at"],
            }
        ] if matched else []
        return {
            "chunks": [chunk],
            "metadata_json": metadata,
            "query": query,
            "metadata_filter": metadata_filter,
            "filter_result": {
                "matched": matched,
                "applied_filters": metadata_filter,
                "rejected_reasons": rejected_reasons,
            },
            "search_results": search_results,
            "citation_preview": [citation] if matched else [],
            "traceability_fields": ["source", "page", "section", "permission", "updated_at"],
            "learning_note": learning_note,
        }

    def _duplicate(self, data: dict[str, Any]) -> dict[str, Any]:
        raw_documents = data.get("documents", [])
        if not isinstance(raw_documents, list) or not 2 <= len(raw_documents) <= 20:
            raise ValueError("documentsは2件以上20件以下の配列で指定してください。")

        documents: list[dict[str, str]] = []
        document_ids: set[str] = set()
        for index, raw_document in enumerate(raw_documents):
            if isinstance(raw_document, str):
                document = {
                    "document_id": f"doc-{index + 1}",
                    "title": f"文書{index + 1}",
                    "version": "－",
                    "text": raw_document.strip(),
                }
            elif isinstance(raw_document, dict):
                document = {
                    "document_id": str(raw_document.get("document_id", f"doc-{index + 1}")).strip(),
                    "title": str(raw_document.get("title", f"文書{index + 1}")).strip(),
                    "version": str(raw_document.get("version", "－")).strip() or "－",
                    "text": str(raw_document.get("text", "")).strip(),
                }
            else:
                raise ValueError("documentsの各要素は文字列またはJSONオブジェクトで指定してください。")
            if not document["document_id"] or not document["title"] or not document["text"]:
                raise ValueError("各文書のdocument_id、title、textは空にできません。")
            if document["document_id"] in document_ids:
                raise ValueError("document_idは重複しない値を指定してください。")
            document_ids.add(document["document_id"])
            documents.append(document)

        threshold_value = data.get("similarity_threshold", 0.75)
        if isinstance(threshold_value, bool) or not isinstance(threshold_value, (int, float)):
            raise ValueError("similarity_thresholdは0から1の数値で指定してください。")
        threshold = float(threshold_value)
        if not 0 <= threshold <= 1:
            raise ValueError("similarity_thresholdは0から1の範囲で指定してください。")

        resolution_value = data.get("resolution", {})
        if not isinstance(resolution_value, dict):
            raise ValueError("resolutionはJSONオブジェクトで指定してください。")
        action = str(resolution_value.get("action", "review")).strip()
        if action not in {"review", "prefer", "exclude"}:
            raise ValueError("resolution.actionはreview、prefer、excludeのいずれかで指定してください。")
        preferred_document_id = str(resolution_value.get("preferred_document_id", "")).strip()
        excluded_value = resolution_value.get("excluded_document_ids", [])
        if not isinstance(excluded_value, list):
            raise ValueError("resolution.excluded_document_idsは配列で指定してください。")
        excluded_document_ids = [str(document_id).strip() for document_id in excluded_value]
        unknown_decision_ids = ({preferred_document_id} if preferred_document_id else set()) | set(excluded_document_ids)
        unknown_decision_ids -= document_ids
        if unknown_decision_ids:
            raise ValueError(f"resolutionに存在しないdocument_idがあります: {', '.join(sorted(unknown_decision_ids))}")
        if action == "prefer" and not preferred_document_id:
            raise ValueError("preferを選ぶ場合はpreferred_document_idを指定してください。")
        if preferred_document_id and preferred_document_id in excluded_document_ids:
            raise ValueError("優先文書を除外文書へ同時に指定できません。")
        resolution = {
            "action": action,
            "preferred_document_id": preferred_document_id,
            "excluded_document_ids": excluded_document_ids,
            "decision_note": str(resolution_value.get("decision_note", "")).strip(),
        }

        learning_note_value = data.get("learning_note", {})
        if not isinstance(learning_note_value, dict):
            raise ValueError("learning_noteはJSONオブジェクトで指定してください。")
        learning_note = dict(learning_note_value)

        def normalize(text: str) -> str:
            normalized = unicodedata.normalize("NFKC", text).casefold()
            return re.sub(r"[^0-9a-zぁ-んァ-ヶ一-龠]+", "", normalized)

        candidate_pairs: list[dict[str, Any]] = []
        adjacency: dict[str, set[str]] = {document["document_id"]: set() for document in documents}
        for left_index, left in enumerate(documents):
            left_normalized = normalize(left["text"])
            for right in documents[left_index + 1:]:
                right_normalized = normalize(right["text"])
                exact_match = left["text"] == right["text"]
                normalized_match = left_normalized == right_normalized
                similarity = round(SequenceMatcher(None, left_normalized, right_normalized).ratio(), 4)
                duplicate_candidate = exact_match or normalized_match or similarity >= threshold
                if exact_match:
                    match_type = "完全一致"
                elif normalized_match:
                    match_type = "正規化後一致"
                elif duplicate_candidate:
                    match_type = "類似文書"
                else:
                    match_type = "候補外"
                if duplicate_candidate:
                    adjacency[left["document_id"]].add(right["document_id"])
                    adjacency[right["document_id"]].add(left["document_id"])
                candidate_pairs.append({
                    "left_id": left["document_id"],
                    "left_title": left["title"],
                    "left_version": left["version"],
                    "right_id": right["document_id"],
                    "right_title": right["title"],
                    "right_version": right["version"],
                    "left_hash": hashlib.sha256(left_normalized.encode("utf-8")).hexdigest()[:12],
                    "right_hash": hashlib.sha256(right_normalized.encode("utf-8")).hexdigest()[:12],
                    "score": similarity,
                    "match_type": match_type,
                    "duplicate_candidate": duplicate_candidate,
                })

        document_by_id = {document["document_id"]: document for document in documents}
        duplicate_groups: list[dict[str, Any]] = []
        visited: set[str] = set()
        for document_id in document_by_id:
            if document_id in visited or not adjacency[document_id]:
                continue
            stack = [document_id]
            group_ids: list[str] = []
            while stack:
                current = stack.pop()
                if current in visited:
                    continue
                visited.add(current)
                group_ids.append(current)
                stack.extend(sorted(adjacency[current] - visited, reverse=True))
            duplicate_groups.append({
                "group_id": f"group-{len(duplicate_groups) + 1}",
                "document_ids": group_ids,
                "titles": [document_by_id[item]["title"] for item in group_ids],
                "versions": [document_by_id[item]["version"] for item in group_ids],
                "review_status": "判断を記録済み" if action != "review" else "目視確認が必要",
            })

        decision_records = []
        for document in documents:
            document_id = document["document_id"]
            if document_id == preferred_document_id:
                decision = "優先文書"
            elif document_id in excluded_document_ids:
                decision = "除外"
            elif adjacency[document_id]:
                decision = "確認対象"
            else:
                decision = "登録候補"
            decision_records.append({**document, "decision": decision})

        query = str(data.get("query", "")).strip()
        search_bias_preview: list[dict[str, Any]] = []
        if query:
            normalized_query = normalize(query)
            for document in documents:
                normalized_text = normalize(document["text"])
                search_bias_preview.append({
                    "document_id": document["document_id"],
                    "title": document["title"],
                    "score": round(SequenceMatcher(None, normalized_query, normalized_text).ratio(), 4),
                    "duplicate_group": next(
                        (group["group_id"] for group in duplicate_groups if document["document_id"] in group["document_ids"]),
                        "－",
                    ),
                })
            search_bias_preview.sort(key=lambda row: (-row["score"], row["document_id"]))

        candidate_count = sum(1 for pair in candidate_pairs if pair["duplicate_candidate"])
        return {
            "documents": documents,
            "similarity_threshold": threshold,
            "candidate_pairs": candidate_pairs,
            "duplicate_groups": duplicate_groups,
            "candidate_count": candidate_count,
            "exact_match_count": sum(1 for pair in candidate_pairs if pair["match_type"] in {"完全一致", "正規化後一致"}),
            "similar_match_count": sum(1 for pair in candidate_pairs if pair["match_type"] == "類似文書"),
            "resolution": resolution,
            "decision_records": decision_records,
            "query": query,
            "search_bias_preview": search_bias_preview,
            "bias_warning": (
                "重複候補が検索上位を占める可能性があります。登録前に優先文書と除外文書を確認してください。"
                if candidate_count
                else "現在のしきい値では重複候補はありません。"
            ),
            "learning_note": learning_note,
        }

    def _ground_truth(self, data: dict[str, Any]) -> dict[str, Any]:
        dataset_name = str(data.get("dataset_name", "")).strip()
        question = str(data.get("question", "")).strip()
        expected_answer = str(data.get("expected_answer", "")).strip()

        source_value = data.get("source_document", {})
        if not isinstance(source_value, dict):
            raise ValueError("source_documentはJSONオブジェクトで指定してください。")
        source_document = {
            "document_id": str(source_value.get("document_id", "")).strip(),
            "title": str(source_value.get("title", "")).strip(),
            "version": str(source_value.get("version", "")).strip(),
            "text": str(source_value.get("text", "")).strip(),
        }

        evidence_value = data.get("evidence", [])
        if not isinstance(evidence_value, list):
            raise ValueError("evidenceは根拠の配列で指定してください。")
        if len(evidence_value) > 10:
            raise ValueError("evidenceは10件以下で指定してください。")
        evidence_records: list[dict[str, Any]] = []
        for index, item in enumerate(evidence_value):
            if isinstance(item, str):
                record = {
                    "document_id": source_document["document_id"],
                    "quote": item.strip(),
                }
            elif isinstance(item, dict):
                record = {
                    "document_id": str(item.get("document_id", "")).strip(),
                    "quote": str(item.get("quote", "")).strip(),
                }
            else:
                raise ValueError("evidenceの各要素は文字列またはJSONオブジェクトで指定してください。")
            record["evidence_id"] = f"evidence-{index + 1}"
            record["source_exists"] = bool(
                record["document_id"]
                and record["document_id"] == source_document["document_id"]
            )
            record["quote_found"] = bool(
                record["quote"]
                and source_document["text"]
                and record["quote"] in source_document["text"]
            )
            evidence_records.append(record)

        viewpoints_value = data.get("evaluation_viewpoints", [])
        if not isinstance(viewpoints_value, list):
            raise ValueError("evaluation_viewpointsは評価観点の配列で指定してください。")
        if len(viewpoints_value) > 10:
            raise ValueError("evaluation_viewpointsは10件以下で指定してください。")
        viewpoints: list[dict[str, Any]] = []
        viewpoint_ids: set[str] = set()
        for item in viewpoints_value:
            if not isinstance(item, dict):
                raise ValueError("evaluation_viewpointsの各要素はJSONオブジェクトで指定してください。")
            viewpoint_id = str(item.get("viewpoint_id", "")).strip()
            weight_value = item.get("weight", 0)
            if isinstance(weight_value, bool) or not isinstance(weight_value, (int, float)):
                raise ValueError("evaluation_viewpoints.weightは0から1の数値で指定してください。")
            weight = float(weight_value)
            if not 0 <= weight <= 1:
                raise ValueError("evaluation_viewpoints.weightは0から1の範囲で指定してください。")
            if viewpoint_id and viewpoint_id in viewpoint_ids:
                raise ValueError("evaluation_viewpoints.viewpoint_idは重複しない値を指定してください。")
            viewpoint_ids.add(viewpoint_id)
            viewpoints.append({
                "viewpoint_id": viewpoint_id,
                "label": str(item.get("label", "")).strip(),
                "description": str(item.get("description", "")).strip(),
                "weight": weight,
            })

        review_value = data.get("review", {})
        if not isinstance(review_value, dict):
            raise ValueError("reviewはJSONオブジェクトで指定してください。")
        requested_status = str(review_value.get("status", "draft")).strip() or "draft"
        if requested_status not in {"draft", "approved", "rejected"}:
            raise ValueError("review.statusはdraft、approved、rejectedのいずれかで指定してください。")
        review = {
            "status": requested_status,
            "reviewer": str(review_value.get("reviewer", "")).strip(),
            "comment": str(review_value.get("comment", "")).strip(),
        }

        learning_note_value = data.get("learning_note", {})
        if not isinstance(learning_note_value, dict):
            raise ValueError("learning_noteはJSONオブジェクトで指定してください。")
        learning_note = {
            "observation": str(learning_note_value.get("observation", "")).strip(),
            "decision": str(learning_note_value.get("decision", "")).strip(),
            "risk_note": str(learning_note_value.get("risk_note", "")).strip(),
        }

        tags_value = data.get("tags", [])
        if not isinstance(tags_value, list):
            raise ValueError("tagsは文字列の配列で指定してください。")
        tags = [str(tag).strip() for tag in tags_value if str(tag).strip()]

        issues: list[str] = []
        if not dataset_name:
            issues.append("データセット名が入力されていません。")
        if not source_document["document_id"] or not source_document["title"] or not source_document["text"]:
            issues.append("根拠文書のdocument_id、title、textを入力してください。")
        if not question:
            issues.append("質問が入力されていません。")
        if not expected_answer:
            issues.append("期待する回答が入力されていません。")
        if not evidence_records:
            issues.append("根拠が入力されていません。")
        for evidence in evidence_records:
            if not evidence["document_id"] or not evidence["quote"]:
                issues.append(f"{evidence['evidence_id']}のdocument_idとquoteを入力してください。")
            elif not evidence["source_exists"]:
                issues.append(f"{evidence['evidence_id']}が登録した根拠文書を参照していません。")
            elif not evidence["quote_found"]:
                issues.append(f"{evidence['evidence_id']}の引用文が根拠文書に存在しません。")
        if not viewpoints:
            issues.append("評価観点が入力されていません。")
        for viewpoint in viewpoints:
            if not viewpoint["viewpoint_id"] or not viewpoint["label"] or not viewpoint["description"]:
                issues.append("各評価観点のviewpoint_id、label、descriptionを入力してください。")
        weight_total = round(sum(viewpoint["weight"] for viewpoint in viewpoints), 4)
        if viewpoints and not math.isclose(weight_total, 1.0, abs_tol=0.0001):
            issues.append("評価観点のweight合計を1にしてください。")
        if requested_status in {"approved", "rejected"} and not review["reviewer"]:
            issues.append("承認または差戻しにはreviewerを入力してください。")
        if requested_status in {"approved", "rejected"} and not review["comment"]:
            issues.append("承認または差戻しにはcommentを入力してください。")

        ready_for_evaluation = requested_status == "approved" and not issues
        status = "approved" if ready_for_evaluation else ("rejected" if requested_status == "rejected" else "draft")
        status_label = {"approved": "承認済み", "rejected": "差戻し", "draft": "下書き・要確認"}[status]
        case_id = str(data.get("case_id", "")).strip() or self._run_id(
            "case",
            {
                "dataset_name": dataset_name,
                "question": question,
                "expected_answer": expected_answer,
                "evidence": evidence_records,
            },
        )
        ground_truth_case = {
            "case_id": case_id,
            "dataset_name": dataset_name,
            "source_document_id": source_document["document_id"],
            "question": question,
            "expected_answer": expected_answer,
            "evidence": evidence_records,
            "tags": tags,
        }
        quality_checks = [
            {
                "check": "質問と期待する回答",
                "passed": bool(question and expected_answer),
                "detail": "質問と期待する回答が入力されています。" if question and expected_answer else "入力不足があります。",
            },
            {
                "check": "根拠の追跡",
                "passed": bool(evidence_records) and all(item["source_exists"] for item in evidence_records),
                "detail": "すべての根拠が登録文書を参照しています。" if evidence_records and all(item["source_exists"] for item in evidence_records) else "参照先を確認してください。",
            },
            {
                "check": "引用文の一致",
                "passed": bool(evidence_records) and all(item["quote_found"] for item in evidence_records),
                "detail": "すべての引用文が根拠文書に存在します。" if evidence_records and all(item["quote_found"] for item in evidence_records) else "原文と引用文を照合してください。",
            },
            {
                "check": "評価観点の重み",
                "passed": bool(viewpoints) and math.isclose(weight_total, 1.0, abs_tol=0.0001),
                "detail": f"weight合計: {weight_total}",
            },
            {
                "check": "人による確認",
                "passed": ready_for_evaluation,
                "detail": "評価前の承認が記録されています。" if ready_for_evaluation else "承認前または入力に問題があります。",
            },
        ]
        review_history = [{
            **review,
            "status": status,
            "status_label": status_label,
        }]
        return {
            "case_id": case_id,
            "dataset_name": dataset_name,
            "source_document": source_document,
            "case": ground_truth_case,
            "ground_truth_case": ground_truth_case,
            "evaluation_viewpoints": viewpoints,
            "rubric_weight_total": weight_total,
            "review_status": status,
            "review_status_label": status_label,
            "review_history": review_history,
            "quality_checks": quality_checks,
            "validation_issues": issues,
            "ready_for_evaluation": ready_for_evaluation,
            "dataset_record": {
                "dataset_name": dataset_name,
                "case": ground_truth_case,
                "evaluation_viewpoints": viewpoints,
                "review": review_history[0],
            },
            "learning_note": learning_note,
        }

    def _rag_eval(self, data: dict[str, Any]) -> dict[str, Any]:
        dataset_name = str(data.get("dataset_name", "")).strip()
        run_label = str(data.get("run_label", "")).strip()
        config_value = data.get("rag_config", {})
        if not isinstance(config_value, dict):
            raise ValueError("rag_configはJSONオブジェクトで指定してください。")
        top_k_value = config_value.get("top_k", 3)
        if isinstance(top_k_value, bool) or not isinstance(top_k_value, int) or top_k_value < 1:
            raise ValueError("rag_config.top_kは1以上の整数で指定してください。")
        rag_config = {
            "retriever_version": str(config_value.get("retriever_version", "")).strip(),
            "generator_version": str(config_value.get("generator_version", "")).strip(),
            "prompt_version": str(config_value.get("prompt_version", "")).strip(),
            "top_k": top_k_value,
        }

        cases_value = data.get("ground_truth_cases", data.get("cases", []))
        if not isinstance(cases_value, list):
            raise ValueError("ground_truth_casesは評価ケースの配列で指定してください。")
        if not 1 <= len(cases_value) <= 100:
            raise ValueError("ground_truth_casesは1件以上100件以下で指定してください。")
        if not dataset_name:
            raise ValueError("dataset_nameを入力してください。")
        if not run_label:
            raise ValueError("run_labelを入力してください。")
        if any(not value for value in rag_config.values()):
            raise ValueError("rag_configのretriever_version、generator_version、prompt_version、top_kを入力してください。")

        results: list[dict[str, Any]] = []
        case_ids: set[str] = set()
        for index, case_value in enumerate(cases_value):
            if not isinstance(case_value, dict):
                raise ValueError("ground_truth_casesの各要素はJSONオブジェクトで指定してください。")
            case_id = str(case_value.get("case_id", f"case-{index + 1:03d}")).strip()
            if not case_id or case_id in case_ids:
                raise ValueError("ground_truth_cases.case_idは空でない重複しない値を指定してください。")
            case_ids.add(case_id)
            question = str(case_value.get("question", "")).strip()
            expected_answer = str(case_value.get("expected_answer", case_value.get("expected", ""))).strip()
            expected_evidence_value = case_value.get("expected_evidence_ids", [])
            retrieval_results_value = case_value.get("retrieval_results", [])
            if not isinstance(expected_evidence_value, list):
                raise ValueError("expected_evidence_idsは文書番号の配列で指定してください。")
            if not isinstance(retrieval_results_value, list):
                raise ValueError("retrieval_resultsは検索結果の配列で指定してください。")
            expected_evidence_ids = [str(item).strip() for item in expected_evidence_value if str(item).strip()]
            retrieval_results = [str(item).strip() for item in retrieval_results_value if str(item).strip()]
            generated_answer = str(case_value.get("generated_answer", "")).strip()
            if not question or not expected_answer or not expected_evidence_ids:
                raise ValueError(f"{case_id}のquestion、expected_answer、expected_evidence_idsを入力してください。")

            top_results = retrieval_results[:top_k_value]
            matched_evidence = [item for item in top_results if item in expected_evidence_ids]
            retrieval_success = bool(matched_evidence)
            answer_score = 1.0 if expected_answer in generated_answer else 0.0
            generation_success = answer_score == 1.0
            if not retrieval_success:
                failure_type = "retrieval_failure"
                failure_label = "検索失敗"
            elif not generation_success:
                failure_type = "generation_failure"
                failure_label = "生成失敗"
            else:
                failure_type = "none"
                failure_label = "成功"
            results.append({
                "case_id": case_id,
                "question": question,
                "expected_answer": expected_answer,
                "expected_evidence_ids": expected_evidence_ids,
                "retrieval_results": retrieval_results,
                "top_k_results": top_results,
                "matched_evidence_ids": matched_evidence,
                "retrieval_success": retrieval_success,
                "generated_answer": generated_answer,
                "answer_score": answer_score,
                "generation_success": generation_success,
                "failure_type": failure_type,
                "failure_label": failure_label,
            })

        case_count = len(results)
        retrieval_success_count = sum(1 for result in results if result["retrieval_success"])
        generation_success_count = sum(1 for result in results if result["generation_success"])
        retrieval_failure_count = sum(1 for result in results if result["failure_type"] == "retrieval_failure")
        generation_failure_count = sum(1 for result in results if result["failure_type"] == "generation_failure")
        metrics = {
            "case_count": case_count,
            "retrieval_success_rate": round(retrieval_success_count / case_count, 3),
            "generation_success_rate": round(generation_success_count / case_count, 3),
            "average_answer_score": round(sum(float(result["answer_score"]) for result in results) / case_count, 3),
            "retrieval_failure_count": retrieval_failure_count,
            "generation_failure_count": generation_failure_count,
        }
        previous_run = next(
            (
                run
                for run in self._runs["system32"]
                if str(run.get("input", {}).get("dataset_name", "")) == dataset_name
                and run.get("input", {}).get("rag_config") == rag_config
            ),
            None,
        )
        previous_metrics = (
            previous_run.get("result", {}).get("metrics", {})
            if isinstance(previous_run, dict)
            else {}
        )
        metric_keys = ("retrieval_success_rate", "generation_success_rate", "average_answer_score")
        regression_diff = {
            "has_previous_run": bool(previous_metrics),
            "previous_run_id": previous_run.get("run_id") if isinstance(previous_run, dict) else None,
            "previous_run_label": previous_run.get("result", {}).get("run_label") if isinstance(previous_run, dict) else None,
            "metric_deltas": {
                key: round(float(metrics[key]) - float(previous_metrics.get(key, metrics[key])), 3)
                for key in metric_keys
            },
            "regressed_metrics": [
                key
                for key in metric_keys
                if previous_metrics and float(metrics[key]) < float(previous_metrics.get(key, metrics[key]))
            ],
        }
        learning_note_value = data.get("learning_note", {})
        if not isinstance(learning_note_value, dict):
            raise ValueError("learning_noteはJSONオブジェクトで指定してください。")
        return {
            "dataset_name": dataset_name,
            "run_label": run_label,
            "rag_config": rag_config,
            "case_count": case_count,
            "retrieval_hit_rate": metrics["retrieval_success_rate"],
            "average_answer_score": metrics["average_answer_score"],
            "metrics": metrics,
            "case_results": results,
            "failure_summary": {
                "retrieval_failure_count": retrieval_failure_count,
                "generation_failure_count": generation_failure_count,
            },
            "regression_diff": regression_diff,
            "learning_note": {
                "observation": str(learning_note_value.get("observation", "")).strip(),
                "decision": str(learning_note_value.get("decision", "")).strip(),
                "risk_note": str(learning_note_value.get("risk_note", "")).strip(),
            },
        }

    def _retrieval_eval(self, data: dict[str, Any]) -> dict[str, Any]:
        evaluation_name = str(data.get("evaluation_name", "retrieval-evaluation")).strip()
        chunk_setting = str(data.get("chunk_setting", "default-chunks")).strip()
        top_k_value = data.get("top_k", 3)
        if isinstance(top_k_value, bool) or not isinstance(top_k_value, int) or top_k_value < 1:
            raise ValueError("top_kは1以上の整数で指定してください。")
        if not evaluation_name:
            raise ValueError("evaluation_nameを入力してください。")
        if not chunk_setting:
            raise ValueError("chunk_settingを入力してください。")

        query_cases_value = data.get("query_cases")
        if "expected_evidence" in data or "retrieval_results" in data:
            query_cases_value = [{
                "case_id": "case-001",
                "question": str(data.get("question", "検索結果を評価する質問")),
                "expected_evidence": data.get("expected_evidence", []),
                "retrieval_results": data.get("retrieval_results", []),
            }]
        if not isinstance(query_cases_value, list) or not 1 <= len(query_cases_value) <= 100:
            raise ValueError("query_casesは1件以上100件以下の配列で指定してください。")

        case_results: list[dict[str, Any]] = []
        case_ids: set[str] = set()
        for index, case_value in enumerate(query_cases_value):
            if not isinstance(case_value, dict):
                raise ValueError("query_casesの各要素はJSONオブジェクトで指定してください。")
            case_id = str(case_value.get("case_id", f"case-{index + 1:03d}")).strip()
            question = str(case_value.get("question", "")).strip()
            expected_value = case_value.get("expected_evidence", case_value.get("expected_evidence_ids", []))
            retrieval_value = case_value.get("retrieval_results", [])
            if not case_id or case_id in case_ids:
                raise ValueError("query_cases.case_idは空でない重複しない値を指定してください。")
            if not question:
                raise ValueError(f"{case_id}のquestionを入力してください。")
            if not isinstance(expected_value, list) or not isinstance(retrieval_value, list):
                raise ValueError(f"{case_id}のexpected_evidenceとretrieval_resultsは配列で指定してください。")
            expected = [str(item).strip() for item in expected_value if str(item).strip()]
            results = [str(item).strip() for item in retrieval_value if str(item).strip()]
            if not expected:
                raise ValueError(f"{case_id}のexpected_evidenceを1件以上指定してください。")
            if not results:
                raise ValueError(f"{case_id}のretrieval_resultsを1件以上指定してください。")
            case_ids.add(case_id)

            top_k = min(top_k_value, len(results))
            top_results = results[:top_k]
            expected_set = set(expected)
            matched = list(dict.fromkeys(document_id for document_id in top_results if document_id in expected_set))
            first_relevant_rank = next(
                (rank for rank, document_id in enumerate(top_results, start=1) if document_id in expected_set),
                None,
            )
            recall = round(len(matched) / len(expected_set), 3)
            precision = round(len(matched) / top_k, 3)
            missing = [document_id for document_id in expected if document_id not in top_results]
            if not matched:
                failure_type = "no_relevant_in_top_k"
                failure_label = "上位検索結果に正解文書がない"
            elif missing:
                failure_type = "partial_recall"
                failure_label = "正解文書の一部を見逃している"
            else:
                failure_type = "none"
                failure_label = "正解文書を取得できている"
            case_results.append({
                "case_id": case_id,
                "question": question,
                "top_k": top_k,
                "hit_at_k": 1.0 if matched else 0.0,
                "recall_at_k": recall,
                "precision_at_k": precision,
                "reciprocal_rank": round(1 / first_relevant_rank, 3) if first_relevant_rank else 0.0,
                "matched_evidence": matched,
                "missing_evidence": missing,
                "failure_type": failure_type,
                "failure_label": failure_label,
                "ranked_results": [
                    {
                        "rank": rank,
                        "document_id": document_id,
                        "expected_evidence": document_id in expected_set,
                        "within_top_k": rank <= top_k,
                    }
                    for rank, document_id in enumerate(results, start=1)
                ],
            })

        case_count = len(case_results)
        metrics = {
            "case_count": case_count,
            "hit_rate": round(sum(float(row["hit_at_k"]) for row in case_results) / case_count, 3),
            "average_recall_at_k": round(sum(float(row["recall_at_k"]) for row in case_results) / case_count, 3),
            "average_precision_at_k": round(sum(float(row["precision_at_k"]) for row in case_results) / case_count, 3),
            "mean_reciprocal_rank": round(sum(float(row["reciprocal_rank"]) for row in case_results) / case_count, 3),
        }
        failure_cases = [
            {
                "case_id": row["case_id"],
                "question": row["question"],
                "failure_type": row["failure_type"],
                "failure_label": row["failure_label"],
                "missing_evidence": row["missing_evidence"],
            }
            for row in case_results
            if row["failure_type"] != "none"
        ]
        previous_run = next(
            (
                run for run in self._runs["system33"]
                if str(run.get("input", {}).get("evaluation_name", "retrieval-evaluation")) == evaluation_name
            ),
            None,
        )
        previous_metrics = previous_run.get("result", {}).get("metrics", {}) if isinstance(previous_run, dict) else {}
        metric_keys = ("hit_rate", "average_recall_at_k", "average_precision_at_k", "mean_reciprocal_rank")
        chunk_comparison = {
            "has_previous_run": bool(previous_metrics),
            "previous_run_id": previous_run.get("run_id") if isinstance(previous_run, dict) else None,
            "previous_chunk_setting": previous_run.get("result", {}).get("chunk_setting") if isinstance(previous_run, dict) else None,
            "current_chunk_setting": chunk_setting,
            "metric_deltas": {
                key: round(float(metrics[key]) - float(previous_metrics.get(key, metrics[key])), 3)
                for key in metric_keys
            },
        }
        learning_note_value = data.get("learning_note", {})
        if not isinstance(learning_note_value, dict):
            raise ValueError("learning_noteはJSONオブジェクトで指定してください。")
        first_case = case_results[0]
        return {
            "evaluation_name": evaluation_name,
            "chunk_setting": chunk_setting,
            "top_k": top_k_value,
            "case_count": case_count,
            "metrics": metrics,
            "case_results": case_results,
            "failure_cases": failure_cases,
            "chunk_comparison": chunk_comparison,
            "learning_note": {
                "observation": str(learning_note_value.get("observation", "")).strip(),
                "decision": str(learning_note_value.get("decision", "")).strip(),
                "risk_note": str(learning_note_value.get("risk_note", "")).strip(),
            },
            "hit_at_k": first_case["hit_at_k"],
            "hit_rate": metrics["hit_rate"],
            "recall_at_k": {"k": top_k_value, "recall": metrics["average_recall_at_k"]},
            "precision_at_k": metrics["average_precision_at_k"],
            "reciprocal_rank": metrics["mean_reciprocal_rank"],
            "ranked_results": first_case["ranked_results"],
            "missing_evidence": list(dict.fromkeys(
                document_id for row in case_results for document_id in row["missing_evidence"]
            )),
        }

    def _answer_eval(self, data: dict[str, Any]) -> dict[str, Any]:
        evaluation_name = str(data.get("evaluation_name", "answer-evaluation")).strip()
        question = str(data.get("question", "")).strip()
        expected_answer = str(data.get("expected_answer", "")).strip()
        generated_answer = str(data.get("generated_answer", "")).strip()
        if not evaluation_name:
            raise ValueError("evaluation_nameを入力してください。")
        if not question:
            raise ValueError("questionを入力してください。")
        if not expected_answer:
            raise ValueError("expected_answerを入力してください。")
        if not generated_answer:
            raise ValueError("generated_answerを入力してください。")

        expected_points_value = data.get("expected_points")
        if not isinstance(expected_points_value, list) or not 1 <= len(expected_points_value) <= 20:
            raise ValueError("expected_pointsは1件以上20件以下の配列で指定してください。")
        expected_points: list[dict[str, Any]] = []
        point_ids: set[str] = set()
        for index, point_value in enumerate(expected_points_value, start=1):
            if not isinstance(point_value, dict):
                raise ValueError(f"expected_points[{index}]はオブジェクトで指定してください。")
            point_id = str(point_value.get("point_id", "")).strip()
            label = str(point_value.get("label", "")).strip()
            required_terms_value = point_value.get("required_terms")
            contradiction_terms_value = point_value.get("contradiction_terms", [])
            if not point_id or point_id in point_ids:
                raise ValueError("expected_pointsのpoint_idは重複しない値を指定してください。")
            if not label:
                raise ValueError(f"expected_points[{index}].labelを入力してください。")
            if not isinstance(required_terms_value, list):
                raise ValueError(f"expected_points[{index}].required_termsは配列で指定してください。")
            required_terms = [str(term).strip() for term in required_terms_value if str(term).strip()]
            if not required_terms:
                raise ValueError(f"expected_points[{index}].required_termsを1件以上指定してください。")
            if not isinstance(contradiction_terms_value, list):
                raise ValueError(f"expected_points[{index}].contradiction_termsは配列で指定してください。")
            contradiction_terms = [str(term).strip() for term in contradiction_terms_value if str(term).strip()]
            point_ids.add(point_id)
            expected_points.append({
                "point_id": point_id,
                "label": label,
                "required_terms": required_terms,
                "contradiction_terms": contradiction_terms,
            })

        evidence_value = data.get("evidence")
        if not isinstance(evidence_value, list) or not 1 <= len(evidence_value) <= 30:
            raise ValueError("evidenceは1件以上30件以下の配列で指定してください。")
        evidence: list[dict[str, str]] = []
        evidence_map: dict[str, str] = {}
        for index, item_value in enumerate(evidence_value, start=1):
            if not isinstance(item_value, dict):
                raise ValueError(f"evidence[{index}]はオブジェクトで指定してください。")
            evidence_id = str(item_value.get("evidence_id", "")).strip()
            text = str(item_value.get("text", "")).strip()
            if not evidence_id or evidence_id in evidence_map:
                raise ValueError("evidenceのevidence_idは重複しない値を指定してください。")
            if not text:
                raise ValueError(f"evidence[{index}].textを入力してください。")
            evidence_map[evidence_id] = text
            evidence.append({"evidence_id": evidence_id, "text": text})

        answer_claims_value = data.get("answer_claims")
        if not isinstance(answer_claims_value, list) or not 1 <= len(answer_claims_value) <= 30:
            raise ValueError("answer_claimsは1件以上30件以下の配列で指定してください。")
        answer_claims: list[dict[str, Any]] = []
        claim_ids: set[str] = set()
        normalized_answer = generated_answer.casefold()
        for index, claim_value in enumerate(answer_claims_value, start=1):
            if not isinstance(claim_value, dict):
                raise ValueError(f"answer_claims[{index}]はオブジェクトで指定してください。")
            claim_id = str(claim_value.get("claim_id", "")).strip()
            text = str(claim_value.get("text", "")).strip()
            evidence_ids_value = claim_value.get("evidence_ids", [])
            expected_point_ids_value = claim_value.get("expected_point_ids", [])
            support_terms_value = claim_value.get("support_terms", [])
            if not claim_id or claim_id in claim_ids:
                raise ValueError("answer_claimsのclaim_idは重複しない値を指定してください。")
            if not text or text.casefold() not in normalized_answer:
                raise ValueError(f"answer_claims[{index}].textはgenerated_answerに含まれる文を指定してください。")
            if not isinstance(evidence_ids_value, list) or not isinstance(expected_point_ids_value, list):
                raise ValueError(f"answer_claims[{index}]の参照先は配列で指定してください。")
            if not isinstance(support_terms_value, list):
                raise ValueError(f"answer_claims[{index}].support_termsは配列で指定してください。")
            evidence_ids = [str(value).strip() for value in evidence_ids_value if str(value).strip()]
            expected_point_ids = [str(value).strip() for value in expected_point_ids_value if str(value).strip()]
            support_terms = [str(value).strip() for value in support_terms_value if str(value).strip()]
            unknown_evidence_ids = [value for value in evidence_ids if value not in evidence_map]
            unknown_point_ids = [value for value in expected_point_ids if value not in point_ids]
            if unknown_evidence_ids:
                raise ValueError(f"answer_claims[{index}]が存在しない根拠を参照しています: {', '.join(unknown_evidence_ids)}")
            if unknown_point_ids:
                raise ValueError(f"answer_claims[{index}]が存在しない回答要素を参照しています: {', '.join(unknown_point_ids)}")
            claim_ids.add(claim_id)
            answer_claims.append({
                "claim_id": claim_id,
                "text": text,
                "evidence_ids": list(dict.fromkeys(evidence_ids)),
                "expected_point_ids": list(dict.fromkeys(expected_point_ids)),
                "support_terms": list(dict.fromkeys(support_terms)),
            })

        point_results: list[dict[str, Any]] = []
        for point in expected_points:
            covered_terms = [term for term in point["required_terms"] if term.casefold() in normalized_answer]
            contradiction_terms = [term for term in point["contradiction_terms"] if term.casefold() in normalized_answer]
            point_results.append({
                **point,
                "covered": bool(covered_terms),
                "covered_terms": covered_terms,
                "contradicted": bool(contradiction_terms),
                "matched_contradiction_terms": contradiction_terms,
            })

        claim_results: list[dict[str, Any]] = []
        for claim in answer_claims:
            cited_text = "\n".join(evidence_map[evidence_id] for evidence_id in claim["evidence_ids"])
            supported = bool(claim["evidence_ids"] and claim["support_terms"]) and all(
                term.casefold() in cited_text.casefold() for term in claim["support_terms"]
            )
            relevant = bool(claim["expected_point_ids"])
            claim_results.append({
                **claim,
                "supported": supported,
                "relevant": relevant,
                "assessment": (
                    "必要な回答要素を根拠付きで説明"
                    if supported and relevant
                    else "質問への回答には不要な補足"
                    if supported
                    else "参照した根拠では確認できない主張"
                ),
            })

        point_count = len(point_results)
        claim_count = len(claim_results)
        contradicted_points = [row for row in point_results if row["contradicted"]]
        missing_points = [row for row in point_results if not row["covered"]]
        unsupported_assertions = [row for row in claim_results if not row["supported"]]
        excessive_claims = [row for row in claim_results if row["supported"] and not row["relevant"]]
        correctness = round((point_count - len(contradicted_points)) / point_count, 3)
        groundedness = round((claim_count - len(unsupported_assertions)) / claim_count, 3)
        completeness = round((point_count - len(missing_points)) / point_count, 3)
        conciseness = round((claim_count - len(excessive_claims)) / claim_count, 3)
        score_breakdown = {
            "correctness": correctness,
            "groundedness": groundedness,
            "completeness": completeness,
            "conciseness": conciseness,
        }

        classifications: list[dict[str, str]] = []
        if contradicted_points:
            classifications.append({"code": "incorrect", "label": "不正確な回答", "reason": "期待する回答と矛盾する表現があります。"})
        if missing_points:
            classifications.append({"code": "insufficient", "label": "回答不足", "reason": "必要な回答要素が不足しています。"})
        if unsupported_assertions:
            classifications.append({"code": "unsupported", "label": "根拠のない主張", "reason": "指定した根拠では確認できない主張があります。"})
        if excessive_claims:
            classifications.append({"code": "excessive", "label": "不要情報を含む回答", "reason": "根拠はあるものの質問への回答に不要な補足があります。"})
        if not classifications:
            classifications.append({"code": "acceptable", "label": "要件を満たす回答", "reason": "必要な回答要素が根拠付きで簡潔に含まれています。"})

        risk_flags: list[str] = []
        if contradicted_points:
            risk_flags.append("期待する回答と矛盾する表現を修正してください。")
        if missing_points:
            risk_flags.append("不足している回答要素を追加してください。")
        if unsupported_assertions:
            risk_flags.append("根拠で確認できない主張を削除するか、対応する根拠を追加してください。")
        if excessive_claims:
            risk_flags.append("質問への回答に不要な補足を削除してください。")

        learning_note_value = data.get("learning_note", {})
        if not isinstance(learning_note_value, dict):
            raise ValueError("learning_noteはオブジェクトで指定してください。")
        evaluation_items = [
            {"viewpoint": "正確性", "score": correctness, "reason": f"矛盾する回答要素は{len(contradicted_points)}件です。"},
            {"viewpoint": "根拠性", "score": groundedness, "reason": f"根拠で確認できない主張は{len(unsupported_assertions)}件です。"},
            {"viewpoint": "網羅性", "score": completeness, "reason": f"不足している回答要素は{len(missing_points)}件です。"},
            {"viewpoint": "簡潔性", "score": conciseness, "reason": f"質問への回答に不要な補足は{len(excessive_claims)}件です。"},
        ]
        return {
            "evaluation_name": evaluation_name,
            "question": question,
            "expected_answer": expected_answer,
            "generated_answer": generated_answer,
            "overall_score": round(sum(score_breakdown.values()) / len(score_breakdown), 3),
            "score_breakdown": score_breakdown,
            "evaluation_items": evaluation_items,
            "point_results": point_results,
            "claim_results": claim_results,
            "supporting_evidence": evidence,
            "missing_points": missing_points,
            "contradicted_points": contradicted_points,
            "unsupported_assertions": unsupported_assertions,
            "excessive_claims": excessive_claims,
            "classifications": classifications,
            "risk_flags": risk_flags,
            "improvement_notes": risk_flags if risk_flags else ["現在の回答は設定した評価条件を満たしています。"],
            "learning_note": {
                "observation": str(learning_note_value.get("observation", "")).strip(),
                "decision": str(learning_note_value.get("decision", "")).strip(),
                "risk_note": str(learning_note_value.get("risk_note", "")).strip(),
            },
            "evaluation_note": "回答要素の語句、矛盾語、主張と根拠の対応、質問との関連付けを明示的に照合する再現可能な評価です。意味上の妥当性は表の判定根拠と原文を併せて確認します。",
        }

    def _prompt_ab(self, data: dict[str, Any]) -> dict[str, Any]:
        experiment_name = str(data.get("experiment_name", "")).strip()
        prompt_a = str(data.get("prompt_a", "")).strip()
        prompt_b = str(data.get("prompt_b", "")).strip()
        fixed_conditions_value = data.get("fixed_conditions")
        scoring_weights_value = data.get("scoring_weights")
        cases_value = data.get("evaluation_cases")
        adoption_value = data.get("adoption_record")

        if not experiment_name:
            raise ValueError("experiment_nameを入力してください。")
        if not prompt_a or not prompt_b:
            raise ValueError("prompt_aとprompt_bを入力してください。")
        if not isinstance(fixed_conditions_value, dict):
            raise ValueError("fixed_conditionsをオブジェクトで指定してください。")
        fixed_conditions = dict(fixed_conditions_value)
        required_conditions = ("model", "temperature", "max_tokens", "dataset_version")
        if any(key not in fixed_conditions or fixed_conditions[key] in (None, "") for key in required_conditions):
            raise ValueError("fixed_conditionsにはmodel、temperature、max_tokens、dataset_versionが必要です。")
        if not isinstance(fixed_conditions["temperature"], (int, float)):
            raise ValueError("temperatureは数値で指定してください。")
        if not isinstance(fixed_conditions["max_tokens"], int) or fixed_conditions["max_tokens"] < 1:
            raise ValueError("max_tokensは1以上の整数で指定してください。")

        viewpoint_keys = ("correctness", "groundedness", "completeness", "conciseness")
        if not isinstance(scoring_weights_value, dict) or set(scoring_weights_value) != set(viewpoint_keys):
            raise ValueError("scoring_weightsにはcorrectness、groundedness、completeness、concisenessが必要です。")
        if any(
            not isinstance(scoring_weights_value[key], (int, float)) or scoring_weights_value[key] < 0
            for key in viewpoint_keys
        ):
            raise ValueError("scoring_weightsは0以上の数値で指定してください。")
        scoring_weights = {key: float(scoring_weights_value[key]) for key in viewpoint_keys}
        if abs(sum(scoring_weights.values()) - 1.0) > 0.001:
            raise ValueError("scoring_weightsの合計は1.0にしてください。")

        if not isinstance(cases_value, list) or not cases_value:
            raise ValueError("evaluation_casesを1件以上指定してください。")
        case_ids: set[str] = set()
        normalized_cases: list[dict[str, Any]] = []
        for index, raw_case in enumerate(cases_value, start=1):
            if not isinstance(raw_case, dict):
                raise ValueError(f"evaluation_cases[{index}]はオブジェクトで指定してください。")
            case_id = str(raw_case.get("case_id", "")).strip()
            question = str(raw_case.get("question", "")).strip()
            output_a = str(raw_case.get("output_a", "")).strip()
            output_b = str(raw_case.get("output_b", "")).strip()
            if not case_id or not question or not output_a or not output_b:
                raise ValueError(f"evaluation_cases[{index}]にはcase_id、question、output_a、output_bが必要です。")
            if case_id in case_ids:
                raise ValueError(f"case_idが重複しています: {case_id}")
            case_ids.add(case_id)

            def term_list(field: str, *, required: bool) -> list[str]:
                value = raw_case.get(field, [])
                if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
                    raise ValueError(f"evaluation_cases[{index}].{field}は空でない文字列の配列にしてください。")
                terms = [item.strip() for item in value]
                if required and not terms:
                    raise ValueError(f"evaluation_cases[{index}].{field}を1件以上指定してください。")
                return terms

            max_answer_chars = raw_case.get("max_answer_chars")
            if not isinstance(max_answer_chars, int) or max_answer_chars < 1:
                raise ValueError(f"evaluation_cases[{index}].max_answer_charsは1以上の整数にしてください。")
            normalized_cases.append({
                "case_id": case_id,
                "question": question,
                "required_terms": term_list("required_terms", required=True),
                "evidence_terms": term_list("evidence_terms", required=True),
                "forbidden_terms": term_list("forbidden_terms", required=False),
                "max_answer_chars": max_answer_chars,
                "output_a": output_a,
                "output_b": output_b,
            })

        if not isinstance(adoption_value, dict):
            raise ValueError("adoption_recordをオブジェクトで指定してください。")
        selected_variant = str(adoption_value.get("selected_variant", "")).strip()
        adoption_reason = str(adoption_value.get("reason", "")).strip()
        risk_note = str(adoption_value.get("risk_note", "")).strip()
        if selected_variant not in {"A", "B", "保留"}:
            raise ValueError("adoption_record.selected_variantはA、B、保留のいずれかにしてください。")
        if not adoption_reason:
            raise ValueError("adoption_record.reasonに採用または保留の理由を入力してください。")

        def score_output(answer: str, case: dict[str, Any]) -> dict[str, Any]:
            matched_required = [term for term in case["required_terms"] if term in answer]
            missing_required = [term for term in case["required_terms"] if term not in answer]
            matched_evidence = [term for term in case["evidence_terms"] if term in answer]
            missing_evidence = [term for term in case["evidence_terms"] if term not in answer]
            matched_forbidden = [term for term in case["forbidden_terms"] if term in answer]
            scores = {
                "correctness": 0.0 if matched_forbidden else 1.0,
                "groundedness": round(len(matched_evidence) / len(case["evidence_terms"]), 3),
                "completeness": round(len(matched_required) / len(case["required_terms"]), 3),
                "conciseness": round(min(1.0, case["max_answer_chars"] / len(answer)), 3),
            }
            total_score = round(sum(scores[key] * scoring_weights[key] for key in viewpoint_keys), 3)
            return {
                "answer": answer,
                "answer_length": len(answer),
                "score_breakdown": scores,
                "total_score": total_score,
                "matched_required_terms": matched_required,
                "missing_required_terms": missing_required,
                "matched_evidence_terms": matched_evidence,
                "missing_evidence_terms": missing_evidence,
                "matched_forbidden_terms": matched_forbidden,
            }

        case_results: list[dict[str, Any]] = []
        for case in normalized_cases:
            variant_a = score_output(case["output_a"], case)
            variant_b = score_output(case["output_b"], case)
            score_delta = round(variant_b["total_score"] - variant_a["total_score"], 3)
            comparison_code = "improved" if score_delta > 0 else "regressed" if score_delta < 0 else "unchanged"
            comparison_label = {
                "improved": "Prompt Bで改善",
                "regressed": "Prompt Bで悪化",
                "unchanged": "同点",
            }[comparison_code]
            case_results.append({
                "case_id": case["case_id"],
                "question": case["question"],
                "prompt_a_output": variant_a["answer"],
                "prompt_a_score": variant_a["total_score"],
                "prompt_b_output": variant_b["answer"],
                "prompt_b_score": variant_b["total_score"],
                "score_delta_b_minus_a": score_delta,
                "comparison_code": comparison_code,
                "comparison_label": comparison_label,
                "variant_details": {"A": variant_a, "B": variant_b},
            })

        def variant_summary(variant: str) -> dict[str, Any]:
            detail_key = variant
            score_averages = {
                viewpoint: round(
                    sum(row["variant_details"][detail_key]["score_breakdown"][viewpoint] for row in case_results)
                    / len(case_results),
                    3,
                )
                for viewpoint in viewpoint_keys
            }
            return {
                "variant": variant,
                "prompt": prompt_a if variant == "A" else prompt_b,
                "average_score": round(
                    sum(row["variant_details"][detail_key]["total_score"] for row in case_results) / len(case_results),
                    3,
                ),
                **score_averages,
            }

        variant_results = [variant_summary("A"), variant_summary("B")]
        average_scores = {row["variant"]: row["average_score"] for row in variant_results}
        score_difference = round(average_scores["B"] - average_scores["A"], 3)
        winner = "B" if score_difference > 0 else "A" if score_difference < 0 else "同点"
        recommended_selection = winner if winner in {"A", "B"} else "保留"
        adoption_record = {
            "selected_variant": selected_variant,
            "recommended_variant": recommended_selection,
            "matches_recommendation": selected_variant == recommended_selection,
            "reason": adoption_reason,
            "risk_note": risk_note,
        }
        changed_cases = [row for row in case_results if row["comparison_code"] != "unchanged"]
        improved_cases = [row for row in case_results if row["comparison_code"] == "improved"]
        regressed_cases = [row for row in case_results if row["comparison_code"] == "regressed"]
        unchanged_cases = [row for row in case_results if row["comparison_code"] == "unchanged"]
        return {
            "experiment_name": experiment_name,
            "winner": winner,
            "average_scores": average_scores,
            "score_difference_b_minus_a": score_difference,
            "variant_results": variant_results,
            "case_count": len(case_results),
            "case_results": case_results,
            "changed_cases": changed_cases,
            "improved_cases": improved_cases,
            "regressed_cases": regressed_cases,
            "unchanged_cases": unchanged_cases,
            "fixed_conditions": fixed_conditions,
            "scoring_weights": scoring_weights,
            "adoption_record": adoption_record,
            "evaluation_note": "同じ条件で記録したA/B回答について、禁止語、根拠語、必要語、文字数上限を機械的に照合する再現可能な比較です。回答の意味上の妥当性はケース別結果と原文を併せて確認します。",
        }

    def _trace(self, data: dict[str, Any]) -> dict[str, Any]:
        trace_record, masking = self._build_trace_record(data)
        trace_id = self._trace_id(trace_record)
        required_fields = [
            "trace_name",
            "user_input",
            "retrieved_context",
            "model_config",
            "prompt",
            "prompt_version",
            "output",
            "evaluation",
        ]
        missing_fields = [field for field in required_fields if not data.get(field)]
        field_labels = {
            "trace_name": "Trace名",
            "user_input": "利用者入力",
            "retrieved_context": "検索根拠",
            "model_config": "モデル設定",
            "prompt": "Prompt本文",
            "prompt_version": "Prompt版",
            "output": "モデル出力",
            "evaluation": "評価結果",
        }
        missing_field_labels = [field_labels[field] for field in missing_fields]
        evaluation = trace_record.get("evaluation")
        evaluation_record = evaluation if isinstance(evaluation, dict) else {}
        if missing_fields:
            replay_note = f"再実行する前に不足項目（{'、'.join(missing_field_labels)}）を記録します。"
        elif masking["masked_value_count"]:
            replay_note = "記録項目は揃っています。完全な再実行には、マスク前の値を許可された保管先から補います。"
        else:
            replay_note = "記録した入力、検索根拠、モデル設定、Prompt本文・版を使って同じ条件を組み立てます。"
        return {
            "trace_id": trace_id,
            "schema_version": "1.0",
            "trace_name": trace_record.get("trace_name", ""),
            "trace_record": trace_record,
            "integrity_hash": hashlib.sha256(
                json.dumps(trace_record, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            ).hexdigest(),
            "missing_fields": missing_fields,
            "missing_field_labels": missing_field_labels,
            "replay_ready": not missing_fields,
            "replay_note": replay_note,
            "evaluation_link": {
                "evaluation_id": evaluation_record.get("evaluation_id", "未設定"),
                "status": evaluation_record.get("status", "未設定"),
                "score": evaluation_record.get("score"),
            },
            "masking": masking,
            "retention_note": str(data.get("retention_note", "最新20件を学習用JSONへ保存します。")),
        }

    def _build_trace_record(self, data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
        retrieved_context = data.get("retrieved_context")
        model_config = data.get("model_config")
        evaluation = data.get("evaluation")
        masking_policy = data.get("masking_policy", {})
        if not isinstance(retrieved_context, list):
            raise ValueError("retrieved_contextは配列で指定してください。")
        if not isinstance(model_config, dict):
            raise ValueError("model_configはJSONオブジェクトで指定してください。")
        if not isinstance(evaluation, dict):
            raise ValueError("evaluationはJSONオブジェクトで指定してください。")
        if not isinstance(masking_policy, dict):
            raise ValueError("masking_policyはJSONオブジェクトで指定してください。")
        enabled = masking_policy.get("enabled", True)
        replacement = masking_policy.get("replacement", "[MASKED]")
        terms = masking_policy.get("terms", [])
        if not isinstance(enabled, bool):
            raise ValueError("masking_policy.enabledはtrueまたはfalseで指定してください。")
        if not isinstance(replacement, str) or not replacement:
            raise ValueError("masking_policy.replacementは空でない文字列で指定してください。")
        if not isinstance(terms, list) or any(not isinstance(term, str) or not term for term in terms):
            raise ValueError("masking_policy.termsは空でない文字列の配列で指定してください。")

        raw_record = {
            "trace_name": data.get("trace_name", ""),
            "user_input": data.get("user_input", ""),
            "retrieved_context": retrieved_context,
            "model_config": model_config,
            "prompt": data.get("prompt", ""),
            "prompt_version": data.get("prompt_version", ""),
            "output": data.get("output", ""),
            "evaluation": evaluation,
        }
        masked_count = 0
        protected_fields: list[str] = []

        def mask_value(value: Any) -> tuple[Any, int]:
            if not enabled or not terms:
                return value, 0
            if isinstance(value, str):
                masked = value
                count = 0
                for term in terms:
                    occurrences = masked.count(term)
                    masked = masked.replace(term, replacement)
                    count += occurrences
                return masked, count
            if isinstance(value, list):
                masked_items = []
                count = 0
                for item in value:
                    masked_item, item_count = mask_value(item)
                    masked_items.append(masked_item)
                    count += item_count
                return masked_items, count
            if isinstance(value, dict):
                masked_dict: dict[str, Any] = {}
                count = 0
                for key, item in value.items():
                    masked_item, item_count = mask_value(item)
                    masked_dict[str(key)] = masked_item
                    count += item_count
                return masked_dict, count
            return value, 0

        trace_record: dict[str, Any] = {}
        for field, value in raw_record.items():
            masked_value, field_count = mask_value(value)
            trace_record[field] = masked_value
            masked_count += field_count
            if field_count:
                protected_fields.append(field)
        return trace_record, {
            "enabled": enabled,
            "replacement": replacement,
            "masked_value_count": masked_count,
            "protected_fields": protected_fields,
            "masking_terms_persisted": False,
        }

    def _trace_storage_input(self, data: dict[str, Any]) -> dict[str, Any]:
        trace_record, masking = self._build_trace_record(data)
        return {
            **trace_record,
            "masking_policy": {
                "enabled": masking["enabled"],
                "replacement": masking["replacement"],
                "terms": [],
            },
            "retention_note": str(data.get("retention_note", "最新20件を学習用JSONへ保存します。")),
        }

    def _trace_id(self, trace_record: dict[str, Any]) -> str:
        canonical = json.dumps(trace_record, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        return f"trace-{hashlib.sha256(canonical.encode('utf-8')).hexdigest()[:12]}"

    def _tokens(self, text: str) -> list[str]:
        return re.findall(r"[A-Za-z0-9_]+|[^\sA-Za-z0-9_]", text)

    def _similarity(self, left: str, right: str) -> float:
        left_tokens = set(self._tokens(left.lower()))
        right_tokens = set(self._tokens(right.lower()))
        if not left_tokens or not right_tokens:
            return 0.0
        return round(len(left_tokens & right_tokens) / math.sqrt(len(left_tokens) * len(right_tokens)), 3)

    def _cosine_similarity(self, left: list[float], right: list[float]) -> float:
        left_norm = math.sqrt(sum(value * value for value in left))
        right_norm = math.sqrt(sum(value * value for value in right))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        dot_product = sum(left_value * right_value for left_value, right_value in zip(left, right, strict=True))
        return round(dot_product / (left_norm * right_norm), 6)

    def _run_id(self, prefix: str, payload: dict[str, Any]) -> str:
        digest = hashlib.sha1(repr(sorted(payload.items())).encode("utf-8")).hexdigest()[:10]
        return f"{prefix}-{digest}"


learning_service = LearningSystemService(
    system17_run_file=get_settings().system17_run_file,
    system18_run_file=get_settings().system18_run_file,
    system19_run_file=get_settings().system19_run_file,
    system20_run_file=get_settings().system20_run_file,
    system21_run_file=get_settings().system21_run_file,
    system22_run_file=get_settings().system22_run_file,
    system23_run_file=get_settings().system23_run_file,
    system24_run_file=get_settings().system24_run_file,
    system25_run_file=get_settings().system25_run_file,
    system26_run_file=get_settings().system26_run_file,
    system27_run_file=get_settings().system27_run_file,
    system28_run_file=get_settings().system28_run_file,
    system29_run_file=get_settings().system29_run_file,
    system30_run_file=get_settings().system30_run_file,
    system31_run_file=get_settings().system31_run_file,
    system32_run_file=get_settings().system32_run_file,
    system33_run_file=get_settings().system33_run_file,
    system34_run_file=get_settings().system34_run_file,
    system35_run_file=get_settings().system35_run_file,
    system36_run_file=get_settings().system36_run_file,
)
