from studyai.systems.system03.services.chunk_service import ChunkService


def test_make_chunks_preserves_section_titles_and_splits_large_sections():
    service = ChunkService(max_chars=30, overlap_chars=5)
    text = "# 概要\n" + ("これは説明文です。" * 6) + "\n# 手順\n" + ("手順です。" * 4)

    chunks = service.make_chunks(text)

    assert len(chunks) >= 3
    assert chunks[0]["section_title"] == "# 概要"
    assert chunks[-1]["section_title"] == "# 手順"
    assert all(chunks[index]["chunk_no"] == index + 1 for index in range(len(chunks)))
