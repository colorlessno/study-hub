# datastore comparison

| use case | data model | consistency | query pattern | caution |
|---|---|---|---|---|
| 業務更新 | RDB | strong | SQL/JOIN | schema設計が必要 |
| cache | Key-Value | temporary | key lookup | 永続DBの代替にしない |
| 全文検索 | Search | index based | keyword/filter | 再indexが必要 |
| 分析 | DWH | batch/append | aggregation | OLTP更新に向かない |
| RAG | Vector DB | depends on source | similarity | 根拠管理が必要 |

