# security05 入力検証 基本設計
## 0. 関連要件

- `../requirements/security05_input_validation_requirements.md`

## 1. 設計目的
商品入力とCSV行に対し、型、必須、長さ、数値範囲、列数を検証する。
## 2. 対象範囲

- 商品名と価格
- CSV 3列
- field単位のエラー
- 行番号付きエラー
- CLI demo

## 3. 成果物構成

```text
src/backend/src/studysecurity/systems/security05_input_validation/
  Dockerfile
  package.json
  app/server.js
  app/validators.js

doc/learning_notes/security05_input_validation/
  README.md
  validation_cases.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| product | name、price |
| CSV row | ID、name、priceの3列 |
| row number | CSVエラーの位置 |

## 5. 出力
| 出力 | 内容 |
|---|---|
| product errors | fieldとmessageの配列 |
| CSV errors | rowNumber付きエラー配列 |
| demo output | 正常・異常入力と結果のJSON |

## 6. 処理方針
1. 商品名の必須、型、最大長を検証する
2. 価格の整数性と範囲を検証する
3. CSVの列数を検証する
4. CSVのnameとpriceを商品validatorへ渡す
5. 内部例外を含めないエラーを出力する
## 7. 確認観点

- 正常入力と異常入力を区別できるか
- CSVエラーに行番号が付くか
- 型、形式、業務制約を分けて説明できるか
## 8. 後続工程への引き継ぎ

詳細設計では、validator、エラー形式、CLI demo、確認手順を定義する。
