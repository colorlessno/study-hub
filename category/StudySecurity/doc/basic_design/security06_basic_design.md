# security06 SQL Injection対策 基本設計
## 0. 関連要件

- `../requirements/security06_sql_injection_requirements.md`

## 1. 設計目的
文字列連結SQLとparameterized queryの構造を比較する。
## 2. 対象範囲

- 文字列連結SQL
- placeholder
- parameter配列
- 商品名とstatus条件
- CLI demo

## 3. 成果物構成

```text
src/backend/src/studysecurity/systems/security06_sql_injection/
  Dockerfile
  package.json
  app/query_builder.js
  app/demo.js

doc/learning_notes/security06_sql_injection/
  README.md
  parameterized_query.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| name | 商品名の検索文字列 |
| status | 商品status |
| sample input | ローカル限定の攻撃形式文字列 |

## 5. 出力
| 出力 | 内容 |
|---|---|
| unsafe SQL | 入力が混入した文字列 |
| safe SQL | placeholderを持つSQL本文 |
| params | SQLと分離した値の配列 |

## 6. 処理方針
1. 文字列連結で危険なSQLを生成する
2. 条件ごとにparameter配列へ値を追加する
3. placeholder番号をparameter順に生成する
4. SQL本文と値が分離されることを表示する
5. 実DBへqueryを送信しない
## 7. 確認観点

- SQL本文へ入力値が混入していないか
- placeholderとparameterの対応を説明できるか
- 入力検証とparameterized queryを混同していないか
## 8. 後続工程への引き継ぎ

詳細設計では、query builder、parameter配列、CLI demo、確認手順を定義する。
