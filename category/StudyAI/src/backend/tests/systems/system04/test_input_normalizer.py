from __future__ import annotations

from studyai.systems.system04.services.input_normalizer import InputNormalizer


def test_input_normalizer_parses_csv() -> None:
    normalizer = InputNormalizer()
    product_name, reviews = normalizer.parse_file(
        file_name="reviews.csv",
        content="text,score,date,product_name\n良い,5,2026-04-01,商品A\n悪い,1,2026-04-02,商品A\n".encode("utf-8"),
        product_name=None,
    )

    assert product_name == "商品A"
    assert len(reviews) == 2
    assert reviews[0]["score"] == 5.0
    assert reviews[1]["date"].isoformat() == "2026-04-02"
