# security21 要件定義
## AI content moderation / NSFW classification

## 1. 目的

AIシステムで扱う入力・出力の安全性を判断するために、NSFW、暴力、個人情報、違法行為、自傷、差別表現などの分類と moderation 記録を学ぶ。

## 2. 学習対象

- content safety taxonomy
- NSFW classification
- moderation policy
- allowed / disallowed boundary
- audit record
- user-facing refusal / safe completion

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | コンテンツ分類表を作る |
| FR-02 | 許可、注意、拒否、エスカレーションの判定例を作る |
| FR-03 | NSFWと通常の不快表現、医療・教育文脈を区別する |
| FR-04 | moderation 判定ログの項目を定義する |
| FR-05 | AI回答で拒否する場合の安全な応答例を用意する |
| FR-06 | 分類表・判定レベル・安全応答をポリシーとして実装した moderation 判定エンジンを作る |
| FR-07 | 意図の抽象サマリと文脈を入力に、category / decision / reason_code を返す |
| FR-08 | 判定結果から監査レコードを生成する。full content は保存せず hash 参照とする |
| FR-09 | 抽象ケース表（M-001〜M-006）を期待判定つきで実行し、全ケース一致を検証できる |

## 4. 非機能要件

- 露骨な性的・暴力的内容の詳細生成を目的にしない。
- 教材データは抽象化し、実個人情報を含めない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 実サービスのポリシー策定
- 年齢確認システム
- 画像分類モデルの本格学習

## 6. 成果物

```text
category/StudySecurity/
  doc/requirements/security21_ai_content_moderation_requirements.md
  doc/basic_design/security21_basic_design.md
  doc/detailed_design/security21_detailed_design.md
  doc/learning_notes/security21_ai_content_moderation/
  src/backend/src/studysecurity/systems/security21_ai_content_moderation/
```

learning_notes 配下の教材文書（taxonomy、判定ケース表、audit log schema、安全応答例）は、
実装のポリシー仕様書を兼ねる。

## 7. 受入条件

- NSFWを含むコンテンツ安全性分類を説明できる。
- 許可、拒否、エスカレーションの判断理由を記録できる。
- moderationログに残すべき項目を説明できる。
- `npm run demo` で抽象ケース M-001〜M-006 の判定が期待値と全件一致し、監査レコードが出力される。
