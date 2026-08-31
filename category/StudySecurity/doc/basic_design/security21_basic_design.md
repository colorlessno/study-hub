# security21 基本設計
## AI content moderation / NSFW classification

## 0. 関連要件

- `../requirements/security21_ai_content_moderation_requirements.md`

## 1. 設計目的

AIシステムの入力・出力に対し、コンテンツ安全性分類、判定境界、moderationログ、安全な応答例を設計できる教材にする。

## 2. 対象範囲

- content safety taxonomy
- NSFW classification
- allowed / caution / disallowed / escalation
- audit record
- user-facing refusal / safe completion
- 医療・教育文脈との区別

## 3. 成果物構成

```text
category/StudySecurity/
  doc/learning_notes/security21_ai_content_moderation/
    README.md
    docs/
      content_safety_taxonomy.md      … taxonomy 定義（実装 policy.js の仕様）
      moderation_case_table.md        … 抽象ケース M-001〜M-006（実装 demo.js の検証仕様）
      audit_log_schema.md             … 監査レコード項目（実装 audit_logger.js の仕様）
      safe_response_examples.md       … 安全応答文（実装 policy.js の応答定義）
      escalation_notes.md             … 人による確認へ渡す条件
  src/backend/src/studysecurity/systems/security21_ai_content_moderation/
    package.json
    Dockerfile
    app/
      policy.js         … taxonomy・判定レベル・reason code・安全応答の定義
      moderator.js      … 意図サマリ＋文脈 → category / decision / reason_code の判定エンジン
      audit_logger.js   … 判定結果 → 監査レコード生成（full content 非保存）
      demo.js           … 抽象ケースの実行と期待判定の検証
```

教材文書と実装は同じポリシーを共有する。文書が仕様、コードがその実行形。

## 4. 入力

| 入力 | 内容 |
|---|---|
| 抽象化ケース | NSFW、暴力、個人情報、自傷、差別表現などの短い分類例 |
| policy boundary | 許可、注意、拒否、エスカレーションの基準 |
| 文脈情報 | 医療、教育、ニュース、創作などの扱い |

## 5. 出力

| 出力 | 内容 |
|---|---|
| 分類表 | category、severity、allowed boundary |
| 判定例 | ケース、判定、理由、応答方針 |
| moderationログ項目 | event id、発生日時、source、category、decision、reason code、confidence、sample hash、review要否 |
| 安全応答例 | 拒否時または代替案提示時の応答 |

## 6. 処理方針

1. コンテンツ分類のtaxonomyを作る
2. 抽象化した判定ケースを作る
3. 許可、注意、拒否、エスカレーションに分ける
4. 判定理由とログ項目を定義する
5. 通常回答、境界付き回答、注意付き回答、拒否、エスカレーションの安全な応答例を作る

## 7. 確認観点

- NSFWを含む安全性分類を説明できるか
- 文脈によって判定が変わる理由を説明できるか
- 判定理由と監査ログ項目を分けて記録できるか

## 8. 後続工程への引き継ぎ

詳細設計では、分類表、抽象ケース、ログschema、安全応答テンプレートを定義する。露骨な内容の詳細生成は扱わない。
