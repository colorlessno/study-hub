# security20 PIIマスキング 基本設計

## 0. 関連要件

- `../requirements/security20_pii_masking_requirements.md`

## 1. 設計目的

log・AI入力の前処理としてdummy PIIをmaskし、検出漏れと過剰maskの限界を確認する。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security20_pii_masking/
  package.json
  app/masker.js
  app/demo.js
doc/learning_notes/security20_pii_masking/
  README.md
  masking_policy.md
```

## 3. mask rule

| 種別 | 置換後 |
|---|---|
| email | `[email]` |
| 電話番号 | `[phone]` |
| `CUST-`形式のdummy ID | `[customer-id]` |

## 4. 処理方針

1. 入力をlogへ出す前にmaskする。
2. 種別ごとの正規表現を順番に適用する。
3. 元値を含まない結果だけを出力する。
4. PIIなしの文章を変えないことも確認する。

## 5. 安全制約

- 実個人情報をtestへ使わない。
- 正規表現を完全なPII detectionと扱わない。
- reversible tokenizationやaccess制御をmaskと混同しない。

## 6. 確認観点

- 国・表記揺れ・文脈依存PIIによる検出漏れ
- business identifierの過剰mask
- raw inputを先にlogへ出した場合は後処理で回復できないこと
