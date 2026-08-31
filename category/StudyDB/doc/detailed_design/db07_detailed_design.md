# db07 詳細設計
## NoSQL / cache / search / DWH 比較

## 0. 関連文書

- `../requirements/db07_nosql_cache_search_dwh_requirements.md`
- `../basic_design/db07_basic_design.md`

## 1. 製造対象

```text
doc/learning_notes/db07_nosql_cache_search_dwh/
  README.md
  docs/
    datastore_comparison.md
    customer_order_model_variants.md
    cache_search_dwh_notes.md
    vector_db_rag_notes.md
    db07_completion_check.md
  samples/
    customer_order_rdb.sql
    customer_order_document.json
    customer_order_key_value.json
    sales_event_dwh.csv
    rag_document_embedding_example.json
```

## 2. 比較対象設計

| 分類 | 代表モデル | 教材で扱う観点 |
|---|---|---|
| RDB | table / relation | 正規化、JOIN、トランザクション |
| Document | JSON document | 集約単位、スキーマ柔軟性 |
| Key-Value / cache | key -> value | 高速参照、TTL、一時保存 |
| Search | inverted index | 全文検索、ランキング、フィルタ |
| DWH | columnar / analytical table | 大量集計、追記、分析 |
| Graph | node / edge | 関係探索 |
| Vector DB | embedding | 類似検索、RAG |

## 3. サンプルファイル設計

| ファイル | 内容 |
|---|---|
| `customer_order_rdb.sql` | 顧客、注文、注文明細をRDBで表現 |
| `customer_order_document.json` | 顧客または注文をDocumentとして表現 |
| `customer_order_key_value.json` | cache key、value、TTLの例 |
| `sales_event_dwh.csv` | DWH向け追記イベント例 |
| `rag_document_embedding_example.json` | document id、chunk、embedding placeholderの例 |

## 4. 比較表設計

| 列 | 内容 |
|---|---|
| use case | 業務更新、キャッシュ、全文検索、分析、RAG |
| data model | table、document、key-value、index、columnar、embedding |
| consistency | 強い整合性、結果整合性、用途上許容する揺れ |
| query pattern | 主キー検索、条件検索、全文検索、集計、類似検索 |
| update pattern | 頻繁な更新、追記中心、再index、再計算 |
| selection reason | その用途で選びやすい理由 |
| caution | 選定時の注意点 |

## 5. cache/search/DWH/vector 注意点

| 分類 | 注意点 |
|---|---|
| cache | 永続DBの代替ではなく、失われても復元できるデータを置く |
| search | RDBの完全な代替ではなく、検索体験に合わせてindexを作る |
| DWH | 更新系OLTPではなく、分析向けに追記・集計する |
| vector DB | embedding品質、更新、権限、RAGの根拠提示が必要 |

## 6. StudyAI / StudyWebとの関係

| Study | 関係 |
|---|---|
| `StudyAI` RAG系 | Vector DB、検索、根拠提示の判断材料 |
| `StudyWeb` 業務DB系 | RDB、API、トランザクション、indexの判断材料 |
| `StudyDB db07` | DB選定の横断比較 |

## 7. 確認手順

1. 同じ顧客・注文題材をRDB、Document、Key-Valueで表現する
2. cacheと永続DBの違いを説明する
3. Search DBとRDB検索の違いを説明する
4. DWHが更新系業務DBと違う理由を説明する
5. Vector DBがRAGで使われる理由と注意点を整理する

## 8. 完了条件

- RDB、Document、Key-Value、Search、DWH、Vector DBの違いを説明できる
- 用途別の選定理由と注意点を説明できる
- `StudyAI` と `StudyWeb` の後続テーマへ接続できる

## 9. 安全性

- 製品網羅や有料クラウド利用は行わない
- embeddingはplaceholderにし、実個人情報を含む文書を使わない
- テキストファイルは UTF-8 BOMなしで保存する

