# db07 要件定義
## NoSQL / cache / search / DWH 比較

## 1. 目的

RDB以外のデータストアを、用途・データモデル・更新特性・検索特性から比較し、DB選定の判断材料を増やす。

## 2. 学習対象

- Key-Value / Redis
- Document / MongoDB
- Search / Elasticsearch 系
- DWH / BigQuery・Redshift・ClickHouse 系
- Graph / Neo4j 系
- Vector DB とRAG

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 同じ顧客・注文題材をRDB、Document、Key-Valueで表現比較する |
| FR-02 | cache と永続DBの役割の違いを整理する |
| FR-03 | search DB とRDB検索の違いを整理する |
| FR-04 | DWH が更新系業務DBと違う理由を整理する |
| FR-05 | Vector DB がRAGで使われる理由を整理する |

## 4. 非機能要件

- 製品を大量に触ることより、用途と設計判断の違いを優先する。
- Dockerで扱う場合は軽量なサンプルに限定する。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 各NoSQL製品の本格運用
- 分散クラスタ構築
- 有料クラウドDWHの実利用

## 6. 成果物

```text
category/StudyDB/
  doc/requirements/db07_nosql_cache_search_dwh_requirements.md
  doc/basic_design/db07_basic_design.md
  doc/detailed_design/db07_detailed_design.md
  doc/learning_notes/db07_nosql_cache_search_dwh/
```

## 7. 受入条件

- RDB、Document、Key-Value、Search、DWH、Vector DB の違いを説明できる。
- どの用途でどのデータストアを選びやすいか説明できる。
- `StudyAI` のRAGや `StudyWeb` の業務DB設計と接続して考えられる。
