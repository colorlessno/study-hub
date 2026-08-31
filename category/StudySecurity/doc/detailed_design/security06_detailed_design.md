# security06 SQLインジェクション対策 詳細設計
## 0. 関連文書

- `../requirements/security06_sql_injection_requirements.md`
- `../basic_design/security06_basic_design.md`

## 1. 製造対象

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

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 危険例 | 文字列連結SQLを表示用にのみ生成する |
| 対策例 | SQL本文とパラメータ配列を分離する |
| 検索条件 | 商品名、statusを対象にする |
| 確認 | SQL本文に入力値が混入しないことを検査する |
| 実行形態 | `npm run demo`で危険例と対策例を標準出力へ並べる |

## 3. 安全制約
- 実DBには接続しない。
- 攻撃文字列はローカル学習サンプルに限定する。
- SQL実行ではなくクエリ構造の比較で学習する。
## 4. 確認手順
1. 通常検索条件のSQLとパラメータを確認する。
2. 攻撃文字列を入力してもSQL本文に混入しないことを確認する。
3. 危険例との差分を確認する。
4. READMEの注意事項を読む。
## 5. 完了条件

- プレースホルダーとパラメータの役割を説明できる。
- 文字列連結SQLの危険性を説明できる。
- 実DBなしで対策の考え方を確認できる。
