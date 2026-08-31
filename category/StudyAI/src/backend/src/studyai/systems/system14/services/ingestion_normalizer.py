from __future__ import annotations

import csv
import json
from io import StringIO
from pathlib import Path
from typing import Any

from studyai.common.errors.models import ValidationAppError


class IngestionNormalizer:
    TEXT_FIELDS = ("text", "message", "content", "body", "transcript", "utterance")

    def decode_text(self, file_bytes: bytes) -> str:
        for encoding in ("utf-8-sig", "utf-8", "cp932", "shift_jis"):
            try:
                return file_bytes.decode(encoding)
            except UnicodeDecodeError:
                continue
        raise ValidationAppError("unsupported_text_encoding", "Text encoding is not supported.")

    def normalize_text_file(
        self,
        *,
        file_name: str,
        file_bytes: bytes,
        data_type: str,
        source: str,
        metadata: dict,
    ) -> list[dict]:
        text = self.decode_text(file_bytes).strip()
        if not text:
            raise ValidationAppError("empty_data_file", "Uploaded data file is empty.")

        suffix = Path(file_name.lower()).suffix
        if suffix == ".csv":
            return self._from_csv(text, data_type=data_type, source=source, base_metadata=metadata)
        if suffix == ".json":
            return self._from_json(text, data_type=data_type, source=source, base_metadata=metadata)
        return [self._conversation_from_text(text, data_type=data_type, source=source, metadata=metadata)]

    def normalize_transcript(
        self,
        *,
        transcript_segments: list[dict],
        data_type: str,
        source: str,
        metadata: dict,
    ) -> list[dict]:
        transcript = "\n".join(str(item.get("text") or "").strip() for item in transcript_segments if str(item.get("text") or "").strip())
        if not transcript:
            raise ValidationAppError("empty_transcript", "Transcription result is empty.")
        utterances = [
            {
                "speaker": item.get("speaker") or "unknown",
                "text": str(item.get("text") or "").strip(),
                "start_sec": item.get("start_sec"),
                "end_sec": item.get("end_sec"),
            }
            for item in transcript_segments
            if str(item.get("text") or "").strip()
        ]
        return [
            {
                "data_type": data_type,
                "source": source,
                "transcript": transcript,
                "metadata": metadata,
                "utterances": utterances,
            }
        ]

    def _from_csv(self, text: str, *, data_type: str, source: str, base_metadata: dict) -> list[dict]:
        reader = csv.DictReader(StringIO(text))
        rows = list(reader)
        if not rows:
            raise ValidationAppError("empty_csv_rows", "CSV has no data rows.")
        conversations: list[dict] = []
        for index, row in enumerate(rows, start=1):
            row_metadata = self._row_metadata(row, base_metadata)
            utterance_text = self._extract_text(row)
            if not utterance_text:
                continue
            speaker = row.get("speaker") or row.get("role") or self._infer_speaker(row)
            conversations.append(
                {
                    "data_type": data_type,
                    "source": source,
                    "transcript": utterance_text,
                    "metadata": {**row_metadata, "row_number": index},
                    "utterances": [
                        {
                            "speaker": speaker,
                            "text": utterance_text,
                            "start_sec": None,
                            "end_sec": None,
                        }
                    ],
                }
            )
        if not conversations:
            raise ValidationAppError("no_text_rows", "No text rows were found in CSV.")
        return conversations

    def _from_json(self, text: str, *, data_type: str, source: str, base_metadata: dict) -> list[dict]:
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValidationAppError("invalid_json_file", "JSON file is invalid.") from exc
        rows = payload if isinstance(payload, list) else payload.get("items") if isinstance(payload, dict) else None
        if not isinstance(rows, list):
            raise ValidationAppError("invalid_json_shape", "JSON must be an array or object with items array.")
        conversations: list[dict] = []
        for index, item in enumerate(rows, start=1):
            if not isinstance(item, dict):
                continue
            row_metadata = self._row_metadata(item, base_metadata)
            utterance_text = self._extract_text(item)
            if not utterance_text:
                continue
            conversations.append(
                {
                    "data_type": data_type,
                    "source": source,
                    "transcript": utterance_text,
                    "metadata": {**row_metadata, "row_number": index},
                    "utterances": [
                        {
                            "speaker": item.get("speaker") or item.get("role") or self._infer_speaker(item),
                            "text": utterance_text,
                            "start_sec": None,
                            "end_sec": None,
                        }
                    ],
                }
            )
        if not conversations:
            raise ValidationAppError("no_text_rows", "No text rows were found in JSON.")
        return conversations

    def _conversation_from_text(self, text: str, *, data_type: str, source: str, metadata: dict) -> dict:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        utterances = [{"speaker": self._infer_line_speaker(line), "text": self._strip_speaker_prefix(line)} for line in lines]
        return {
            "data_type": data_type,
            "source": source,
            "transcript": "\n".join(item["text"] for item in utterances),
            "metadata": metadata,
            "utterances": utterances,
        }

    def _extract_text(self, row: dict[str, Any]) -> str:
        for field in self.TEXT_FIELDS:
            value = row.get(field)
            if value:
                return str(value).strip()
        return ""

    @staticmethod
    def _row_metadata(row: dict[str, Any], base_metadata: dict) -> dict:
        metadata = dict(base_metadata)
        for key in ("product", "product_name", "staff_id", "staff_name", "call_reason", "outcome", "customer_segment"):
            if row.get(key) not in (None, ""):
                metadata[key] = row[key]
        return metadata

    @staticmethod
    def _infer_speaker(row: dict[str, Any]) -> str:
        raw = str(row.get("speaker") or row.get("role") or "").lower()
        if raw in {"customer", "user", "client", "顧客"}:
            return "customer"
        if raw in {"staff", "operator", "agent", "sales", "担当者"}:
            return "staff"
        return "unknown"

    @staticmethod
    def _infer_line_speaker(line: str) -> str:
        lowered = line.lower()
        if lowered.startswith(("customer:", "顧客:", "顧客：")):
            return "customer"
        if lowered.startswith(("staff:", "operator:", "agent:", "担当者:", "担当者：")):
            return "staff"
        return "unknown"

    @staticmethod
    def _strip_speaker_prefix(line: str) -> str:
        for separator in (":", "："):
            if separator in line:
                prefix, value = line.split(separator, 1)
                if prefix.lower() in {"customer", "staff", "operator", "agent", "顧客", "担当者"}:
                    return value.strip()
        return line.strip()
