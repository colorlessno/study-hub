from __future__ import annotations

import json


def build_extract_prompts(source_description: str) -> tuple[str, str]:
    schema = {
        "document_type": "請求書 | 領収書 | 納品書 | 不明",
        "issue_date": "YYYY-MM-DD or null",
        "supplier_name": "string or null",
        "supplier_address": "string or null",
        "recipient_name": "string or null",
        "items": [
            {
                "name": "string or null",
                "quantity": "number or null",
                "unit_price": "number or null",
                "amount": "number or null",
            }
        ],
        "subtotal": "number or null",
        "tax_8": "number or null",
        "tax_10": "number or null",
        "total": "number or null",
        "payment_due": "YYYY-MM-DD or null",
        "bank_info": {
            "bank_name": "string or null",
            "branch_name": "string or null",
            "account_type": "string or null",
            "account_number": "string or null",
        },
        "invoice_number": "string or null",
    }
    system_prompt = (
        "あなたは請求書・領収書のデータ抽出専門AIです。"
        "与えられた文書から必要項目を正確に抽出し、必ず JSON のみを返してください。"
        "推測で埋めず、読めない項目は null にしてください。"
        f"出力スキーマ: {json.dumps(schema, ensure_ascii=False)}"
    )
    user_prompt = (
        f"以下の入力から指定項目を抽出してください。\n"
        f"入力種別: {source_description}\n"
        "金額は数値のみ、日付は YYYY-MM-DD 形式で返してください。"
    )
    return system_prompt, user_prompt
