# db05 要件定義
## index / EXPLAIN / 性能確認

## 1. 目的

検索条件、index、実行計画、件数増加による性能差を観察し、なぜDB設計でindexとクエリ確認が必要かを学ぶ。

## 2. 学習対象

- index の役割
- B-tree の概念
- EXPLAIN / EXPLAIN ANALYZE
- 全表走査とindex scan
- カーディナリティ
- N+1 とJOINの入口

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | indexあり/なしの検索比較を作る |
| FR-02 | EXPLAIN の見方を学ぶ最小例を作る |
| FR-03 | 件数を増やしたときの検索時間差を確認する |
| FR-04 | index が効きにくい検索条件を例示する |
| FR-05 | `StudyWeb web50-web51` との関係を明記する |

## 4. 非機能要件

- 性能値は環境差があるため、絶対値ではなく傾向を見る。
- 大量データは生成スクリプトで作り、実個人情報を使わない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 本格的なDBチューニング
- パーティショニング
- 分散DB性能設計

## 6. 成果物

```text
category/StudyDB/
  doc/requirements/db05_index_explain_performance_requirements.md
  doc/basic_design/db05_basic_design.md
  doc/detailed_design/db05_detailed_design.md
  doc/learning_notes/db05_index_explain_performance/
```

## 7. 受入条件

- index がある場合とない場合の違いを説明できる。
- EXPLAIN の代表的な読み取りポイントを説明できる。
- 検索条件からindex設計が必要になる理由を説明できる。
