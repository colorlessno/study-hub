# security20 PIIマスキング 詳細設計
## 0. 関連文書

- `../requirements/security20_pii_masking_requirements.md`
- `../basic_design/security20_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security20_pii_masking/
  Dockerfile
  package.json
  app/masker.js
  app/demo.js
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 対象 | メールアドレス、電話番号、顧客ID風文字列を対象にする |
| マスク | 種別ごとに置換文字列を変える |
| ログ | マスク前の値を出力しない |
| 限界 | 正規表現だけでは検出漏れがあることを説明する |

## 3. 安全制約
- 実個人情報をサンプルに使わない。
- マスキング前データを永続化しない。
- マスキングしすぎの業務影響も説明する。
## 4. 確認手順
1. ダミーPIIを含む文書を入力する。
2. マスキング結果を確認する。
3. 検出漏れと過剰マスキングの限界を読む。
4. ログに元値が出ないことを確認する。
## 5. 完了条件

- PIIマスキング前後を比較できる。
- マスキング対象と非対象の境界を説明できる。
- 正規表現ベースの限界を説明できる。
