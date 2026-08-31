from __future__ import annotations

import csv
import io
import json
from datetime import date

from studyai.common.errors.models import ValidationAppError
from studyai.systems.system04.schemas.analysis import ReviewInput


class InputNormalizer:
    def normalize_reviews(self, *, product_name: str, reviews: list[ReviewInput]) -> list[dict]:
        normalized: list[dict] = []
        for index, review in enumerate(reviews):
            text = review.text.strip()
            if not text:
                continue
            normalized.append(
                {
                    "source_id": review.source_id or f"review-{index + 1}",
                    "product_name": review.product_name or product_name,
                    "text": text,
                    "review_score": review.score,
                    "review_date": review.date,
                }
            )
        if not normalized:
            raise ValidationAppError("empty_reviews", "At least one review is required.")
        return normalized

    def parse_file(self, *, file_name: str, content: bytes, product_name: str | None) -> tuple[str, list[dict]]:
        lowered = file_name.lower()
        if lowered.endswith(".csv"):
            return self._parse_csv(content, product_name)
        if lowered.endswith(".json"):
            return self._parse_json(content, product_name)
        if lowered.endswith(".txt"):
            return self._parse_text(content, product_name)
        raise ValidationAppError("invalid_review_file", "Only CSV, JSON, and TXT files are supported.")

    def _parse_csv(self, content: bytes, product_name: str | None) -> tuple[str, list[dict]]:
        text = content.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames or "text" not in {name.strip() for name in reader.fieldnames}:
            raise ValidationAppError("invalid_review_file", "CSV must include a text column.")
        reviews: list[dict] = []
        resolved_product_name = product_name
        for index, row in enumerate(reader):
            review_text = (row.get("text") or "").strip()
            if not review_text:
                continue
            row_product_name = (row.get("product_name") or product_name or "").strip() or None
            if resolved_product_name is None and row_product_name:
                resolved_product_name = row_product_name
            reviews.append(
                {
                    "source_id": row.get("source_id") or f"csv-{index + 1}",
                    "product_name": row_product_name or product_name or "Uploaded reviews",
                    "text": review_text,
                    "score": self._parse_score(row.get("score")),
                    "date": self._parse_date(row.get("date")),
                }
            )
        if not reviews:
            raise ValidationAppError("empty_reviews", "The uploaded file did not contain valid reviews.")
        return resolved_product_name or "Uploaded reviews", reviews

    def _parse_json(self, content: bytes, product_name: str | None) -> tuple[str, list[dict]]:
        try:
            payload = json.loads(content.decode("utf-8-sig"))
        except json.JSONDecodeError as exc:
            raise ValidationAppError("invalid_review_file", "JSON review file is invalid.") from exc
        if isinstance(payload, dict):
            resolved_product_name = payload.get("product_name") or product_name or "Uploaded reviews"
            reviews_payload = payload.get("reviews", [])
        elif isinstance(payload, list):
            resolved_product_name = product_name or "Uploaded reviews"
            reviews_payload = payload
        else:
            raise ValidationAppError("invalid_review_file", "JSON review file is invalid.")
        reviews: list[dict] = []
        for index, row in enumerate(reviews_payload):
            text = str((row or {}).get("text") or "").strip()
            if not text:
                continue
            reviews.append(
                {
                    "source_id": row.get("source_id") or f"json-{index + 1}",
                    "product_name": row.get("product_name") or resolved_product_name,
                    "text": text,
                    "score": self._parse_score(row.get("score")),
                    "date": self._parse_date(row.get("date")),
                }
            )
        if not reviews:
            raise ValidationAppError("empty_reviews", "The uploaded file did not contain valid reviews.")
        return resolved_product_name, reviews

    def _parse_text(self, content: bytes, product_name: str | None) -> tuple[str, list[dict]]:
        text = content.decode("utf-8-sig")
        reviews = []
        for index, line in enumerate(text.splitlines()):
            review_text = line.strip()
            if not review_text:
                continue
            reviews.append(
                {
                    "source_id": f"txt-{index + 1}",
                    "product_name": product_name or "Uploaded reviews",
                    "text": review_text,
                    "score": None,
                    "date": None,
                }
            )
        if not reviews:
            raise ValidationAppError("empty_reviews", "The uploaded file did not contain valid reviews.")
        return product_name or "Uploaded reviews", reviews

    @staticmethod
    def _parse_score(value) -> float | None:
        if value in (None, ""):
            return None
        try:
            parsed = float(value)
        except (TypeError, ValueError) as exc:
            raise ValidationAppError("invalid_review_score", "Review score is invalid.") from exc
        if parsed < 0 or parsed > 5:
            raise ValidationAppError("invalid_review_score", "Review score must be between 0 and 5.")
        return parsed

    @staticmethod
    def _parse_date(value) -> date | None:
        if value in (None, ""):
            return None
        try:
            return date.fromisoformat(str(value))
        except ValueError as exc:
            raise ValidationAppError("invalid_review_date", "Review date must be ISO format.") from exc
