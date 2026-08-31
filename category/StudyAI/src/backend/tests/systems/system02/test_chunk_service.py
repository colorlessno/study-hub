from studyai.systems.system02.services.chunk_service import ChunkService


def test_split_by_clause_uses_article_boundaries() -> None:
    text = "第1条 目的\n本契約の目的を定める。\n第2条 支払\n支払条件を定める。"
    chunks = ChunkService().split_by_clause(text)

    assert len(chunks) == 2
    assert chunks[0]["article"].startswith("第1条")
    assert "目的" in chunks[0]["chunk_text"]
    assert chunks[1]["article"].startswith("第2条")


def test_align_for_compare_matches_by_article() -> None:
    text_a = "第1条 目的\nA\n第2条 支払\nB"
    text_b = "第1条 目的\nA'\n第3条 責任\nC"
    aligned = ChunkService().align_for_compare(text_a, text_b)

    assert len(aligned) == 3
    assert aligned[0]["article"].startswith("第1条")
