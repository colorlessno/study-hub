# db05 基本設計
## index / EXPLAIN / 性能確認
## 0. 関連要件

- `../requirements/db05_index_explain_performance_requirements.md`

## 1. 設計目的
indexあり/なしの検索、EXPLAIN、件数増加による傾向を観察し、検索条件とindex設計の関係を説明できる教材にする。
## 2. 対象範囲

- index の役割
- B-tree の入口
- EXPLAIN / EXPLAIN ANALYZE
- sequential scan と index scan
- カーディナリティ
- N+1 とJOINの入口

## 3. 成果物構成

```text
category/StudyDB/
  src/apps/db05_index_explain_performance/
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

## 4. 入力
| 入力 | 内容 |
|---|---|
| 検索SQL | customer_id、created_at、status などの検索条件 |
| index SQL | 単一カラムindex、複合index |
| 生成データ | 件数差を見るための教材データ |
| EXPLAIN結果 | index有無の実行計画 |

## 5. 出力
| 出力 | 内容 |
|---|---|
| EXPLAINログ | scan種別、cost、rows、filter |
| 性能観察メモ | 件数増加時の傾向 |
| 関連整理 | `StudyWeb web50-web51` との関係 |

## 6. 処理方針
1. 小さいデータで検索条件を確認する
2. 大きめの教材データを生成する
3. indexなしでEXPLAINを取得する
4. indexを追加してEXPLAINを比較する
5. indexが効きにくい条件を確認する
6. N+1 とJOINの入口を整理する

## 7. 確認観点

- index有無で実行計画が変わる理由を説明できるか
- EXPLAINの代表的な読み取りポイントを説明できるか
- 性能値を絶対値ではなく傾向として扱えているか

## 8. 後続工程への引き継ぎ

詳細設計では、生成件数、index定義、EXPLAIN取得コマンド、観察ログの項目を定義する。
