# db05 詳細設計
## index / EXPLAIN / 性能確認
## 0. 関連文書

- `../requirements/db05_index_explain_performance_requirements.md`
- `../basic_design/db05_basic_design.md`

## 1. 製造対象

```text
src/apps/db05_index_explain_performance/
  README.md
  sql/
    001_schema.sql
    002_seed_small.sql
    003_seed_large.sql
    004_explain_without_index.sql
    005_create_indexes.sql
    006_explain_with_index.sql
    007_ineffective_index_examples.sql
doc/learning_notes/db05_index_explain_performance/
  README.md
  docs/
    explain_log.md
    performance_observation.md
    studyweb_relation.md
```

## 2. DB実行環境
| 項目 | 内容 |
|---|---|
| DB | PostgreSQL 16 alpine |
| database | `studydb` |
| 起動方式 | `category/StudyDB/src/apps/common` の共通DB構成を使う |
| seed方針 | 小規模seedと件数増加seedを分ける |
| 性能記録 | 絶対値ではなく傾向を記録する |

## 3. テーブル設計
| table | column | index候補 |
|---|---|---|
| `orders` | `id`, `customer_id`, `status`, `ordered_at`, `total_amount` | `customer_id`, `ordered_at`, `(status, ordered_at)` |
| `order_items` | `id`, `order_id`, `product_id`, `quantity` | `order_id`, `product_id` |

## 4. SQLファイル設計
| ファイル | 内容 |
|---|---|
| `001_schema.sql` | orders、order_itemsを作成 |
| `002_seed_small.sql` | 読解しやすい少量データ |
| `003_seed_large.sql` | `generate_series`で件数差を作る |
| `004_explain_without_index.sql` | indexなしの検索計画を取得 |
| `005_create_indexes.sql` | 単一index、複合indexを作成 |
| `006_explain_with_index.sql` | indexありの検索計画を取得 |
| `007_ineffective_index_examples.sql` | 関数適用、前方一致以外など効きにくい例 |

## 5. EXPLAIN記録項目

| 項目 | 内容 |
|---|---|
| query | 実行したSQL |
| data volume | orders件数、order_items件数 |
| plan type | Seq Scan、Index Scan、Bitmap Index Scanなど |
| estimated rows | 推定行数 |
| actual time | `EXPLAIN ANALYZE` の時間。環境差があるため傾向のみ扱う |
| note | indexが効く理由、効かなかった理由 |

## 6. StudyWebとの関係
| StudyWeb | 関係 |
|---|---|
| `web50` | N+1によりクエリ回数が増える問題 |
| `web51` | indexあり/なし検索比較のWeb側教材 |
| `db05` | DB側からEXPLAINとindex設計理由を確認する教材 |

## 7. 確認手順
1. schemaとsmall seedを投入する
2. large seedで件数を増やす
3. indexなしでEXPLAINを取得する
4. indexを作成する
5. indexありでEXPLAINを取得し比較する
6. indexが効きにくい例を確認する
7. `StudyWeb web50-web51` との違いを整理する

## 8. 完了条件

- index有無で実行計画が変わることを説明できる
- EXPLAINの代表項目を説明できる
- 性能値を絶対値ではなく傾向として扱える

## 9. 安全性

- 大量データは架空データを生成する
- 実個人情報や実売上データを使わない
- 実行時間が長くなりすぎる件数は詳細設計で上限を設ける
