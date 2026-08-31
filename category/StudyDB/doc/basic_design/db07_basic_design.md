# db07 基本設計
## NoSQL / cache / search / DWH 比較

## 0. 関連要件

- `../requirements/db07_nosql_cache_search_dwh_requirements.md`

## 1. 設計目的

同じ顧客・注文題材を RDB、Document、Key-Value、Search、DWH、Vector DB の観点で比較し、用途別の選定理由を説明できる教材にする。

## 2. 対象範囲

- Key-Value / Redis
- Document / MongoDB
- Search DB
- DWH
- Graph DB
- Vector DB と RAG
- cache と永続DBの違い

## 3. 成果物構成

```text
category/StudyDB/
  doc/learning_notes/db07_nosql_cache_search_dwh/
    README.md
    docs/
      datastore_comparison.md
      customer_order_model_variants.md
      cache_search_dwh_notes.md
      vector_db_rag_notes.md
      db07_completion_check.md
```

## 4. 入力

| 入力 | 内容 |
|---|---|
| 共通題材 | 顧客、注文、商品、検索文書、分析イベント |
| データモデル | table、document、key-value、inverted index、columnar、embedding |
| 用途 | 業務更新、キャッシュ、全文検索、分析、RAG |

## 5. 出力

| 出力 | 内容 |
|---|---|
| データストア比較表 | 保存モデル、更新特性、検索特性、代表用途 |
| 題材表現比較 | 同じデータを各モデルで表現した例 |
| 選定判断記録 | 用途、正本、派生先、選定理由、注意点を記録したMarkdown |
| 関連整理 | `StudyAI` のRAG、`StudyWeb` の業務DB設計との接続 |

## 6. 処理方針

1. 顧客・注文題材をRDB表として整理する
2. 同じ題材をDocumentとKey-Valueで表現する
3. cache と永続DBの役割差を整理する
4. Search DB と RDB検索の違いを整理する
5. DWH が更新系DBと違う理由を整理する
6. Vector DB が RAG で使われる理由を整理する

## 7. 確認観点

- RDB、Document、Key-Value、Search、DWH、Vector DB の違いを説明できるか
- cacheを永続DBの代替として扱わない理由を説明できるか
- AI検索やBIでDB選定が変わる理由を説明できるか

## 8. 後続工程への引き継ぎ

詳細設計では、比較表の列、題材データ、モデル表現例、関連Studyへの参照を定義する。
