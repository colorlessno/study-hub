from studyai.systems.system16.services.skill_normalizer import SkillNormalizer
from studyai.systems.system16.services.skillsheet_parser import SkillsheetParser


def test_skillsheet_parser_detects_layout_and_skills() -> None:
    parser = SkillsheetParser()
    parser._extract_rows = lambda _: [
        ["案件", "担当", "技術", "工程", "経験年数"],
        ["金融システム開発", "SE", "Python AWS PostgreSQL Linux SQL", "要件定義 詳細設計 製造", "5年"],
    ]
    parsed = parser.parse_skillsheet("skillsheet.xlsx", b"dummy", list(SkillNormalizer.BUILTIN_RULES))

    assert parsed["layout_type"] == "A"
    assert parsed["parsed_result"]["skills"]["languages"] == ["Python", "SQL"]
    assert "AWS" in parsed["parsed_result"]["skills"]["tools"]
    assert "PostgreSQL" in parsed["parsed_result"]["skills"]["databases"]
    assert parsed["parsed_result"]["roles"] == ["SE"]
    assert parsed["parsed_result"]["total_projects"] >= 1
