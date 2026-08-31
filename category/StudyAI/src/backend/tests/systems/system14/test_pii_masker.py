from __future__ import annotations

from studyai.systems.system14.services.pii_masker import PIIMasker


def test_pii_masker_masks_contact_information() -> None:
    masker = PIIMasker()

    masked = masker.mask("山田です。mail test@example.com phone 090-1234-5678 住所 123-4567")

    assert "test@example.com" not in masked
    assert "090-1234-5678" not in masked
    assert "123-4567" not in masked
    assert "[masked-email]" in masked
    assert "[masked-phone]" in masked


def test_pii_masker_masks_metadata_sensitive_keys() -> None:
    masked = PIIMasker().mask_metadata({"customer_name": "山田太郎", "product": "商品A"})

    assert masked["customer_name"] == "[masked]"
    assert masked["product"] == "商品A"
