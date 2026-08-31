from __future__ import annotations

from studyai.systems.system14.services.ingestion_normalizer import IngestionNormalizer


def test_ingestion_normalizer_parses_csv_rows() -> None:
    csv_text = "speaker,text,product,staff_id\ncustomer,配送が遅い,商品A,staff_001\nstaff,確認します,商品A,staff_001\n"

    conversations = IngestionNormalizer().normalize_text_file(
        file_name="calls.csv",
        file_bytes=csv_text.encode("utf-8"),
        data_type="chat",
        source="chat_support",
        metadata={"call_reason": "配送確認"},
    )

    assert len(conversations) == 2
    assert conversations[0]["metadata"]["product"] == "商品A"
    assert conversations[0]["utterances"][0]["speaker"] == "customer"


def test_ingestion_normalizer_parses_prefixed_text_lines() -> None:
    text = "顧客: 価格が高いです\n担当者: 次回見積を送付します"

    conversations = IngestionNormalizer().normalize_text_file(
        file_name="mail.txt",
        file_bytes=text.encode("utf-8"),
        data_type="email",
        source="mail",
        metadata={},
    )

    assert len(conversations) == 1
    assert conversations[0]["utterances"][0]["speaker"] == "customer"
    assert conversations[0]["utterances"][1]["speaker"] == "staff"
