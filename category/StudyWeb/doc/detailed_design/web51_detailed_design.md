# web51 indexあり/なし検索比較 詳細設計

## 0. 関連文書

- `../requirements/web51_index_search_comparison_requirements.md`
- `../basic_design/web51_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studyweb/systems/web51_index_search_comparison/
  Dockerfile
  package.json
  app/src/explain-note.js
  db/schema.sql
  db/seed.sql
doc/learning_notes/web51_index_search_comparison/
  README.md
  docs/index_comparison.md
  docs/explain_note.md
```

## 2. 現在の位置付け

StudyHubからテーマ専用のPostgreSQLコンテナを起動し、SQLの準備、索引作成前後の`EXPLAIN (ANALYZE, BUFFERS)`、索引作成、後片付けを順に実行する教材。Node.js scriptは手動確認時の実習案内に使用する。

## 3. Schema

| Column | Type | 内容 |
|---|---|---|
| id | serial primary key | 識別子 |
| name | text not null | 完全一致検索対象 |
| status | text not null | active / archived |
| created_at | timestamp | 作成日時 |

seed.sqlは`generate_series`で10,000件を投入する。

## 4. 比較対象

```sql
select * from products where name = 'product-9999';
```

| 条件 | Index |
|---|---|
| 比較前 | name indexなし |
| 比較後 | `idx_products_name on products(name)` |

schema.sqlのindex作成行はcomment化され、比較開始時はindexなし。

## 5. 確認項目

- scan method
- estimated / actual rows
- planning / execution time
- loops
- buffers
- 同じqueryを複数回実行したcache影響

## 6. 制約

- StudyHubの実行結果へ索引作成前後の実行計画を表示するが、比較結果を別ファイルへ自動保存しない。
- 10,000件では環境により差が小さい場合がある。
- name完全一致と単一B-tree indexだけを扱う。
- write cost・storage増加は実測しない。

## 7. 確認手順

1. 学習用DBへschema・seedを適用する。
2. ANALYZE後、indexなしでEXPLAIN ANALYZEを実行する。
3. scan・rows・time・buffersを記録する。
4. name indexを作り、再度ANALYZEする。
5. 同じquery・同じ項目を記録して比較する。
6. indexをdropし、学習環境を後片付けする。

## 8. 完了条件

- index作成前後の実行計画を比較できる。
- 検索条件とindex列の関係を説明できる。
- plannerが常にindexを選ぶわけではないと説明できる。
- read benefitとwrite / storage costの両方を説明できる。
