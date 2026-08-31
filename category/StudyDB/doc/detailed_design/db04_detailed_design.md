# db04 詳細設計
## トランザクション・ロック・分離レベル

## 0. 関連文書

- `../requirements/db04_transaction_lock_isolation_requirements.md`
- `../basic_design/db04_basic_design.md`

## 1. 製造対象

```text
src/apps/db04_transaction_lock_isolation/
  README.md
  sql/
    001_schema.sql
    002_seed.sql
    003_commit_rollback.sql
    004_concurrent_update_session_a.sql
    005_concurrent_update_session_b.sql
    006_isolation_observation.sql
doc/learning_notes/db04_transaction_lock_isolation/
  README.md
  docs/
    transaction_log.md
    concurrent_update_log.md
    isolation_matrix.md
```

## 2. DB実行環境
| 項目 | 内容 |
|---|---|
| DB | PostgreSQL 16 alpine |
| database | `studydb` |
| 実行方式 | 1つのpsqlセッションで更新、ロック確認、rollbackを順番に実行する |
| 起動方式 | `category/StudyDB/src/apps/common` の共通DB構成を使う |
| 前提 | 教材DBのみを操作する |

## 3. テーブル設計
| table | column | 目的 |
|---|---|---|
| `products` | `id`, `name`, `stock`, `updated_at` | 在庫減算とrollbackの観察 |
| `orders` | `id`, `product_id`, `quantity`, `status`, `created_at` | 注文処理 |
| `transaction_events` | `id`, `event_name`, `note`, `created_at` | rollback確認用の記録 |

## 4. SQLファイル設計
| ファイル | 内容 |
|---|---|
| `001_schema.sql` | products、orders、transaction_eventsを作成 |
| `002_seed.sql` | 在庫数を持つ商品を投入 |
| `003_commit_rollback.sql` | 正常commitと途中失敗rollbackを確認 |
| `004_concurrent_update_session_a.sql` | 単一セッションで在庫行を更新し、自分が保持するロックを確認してrollbackする |
| `005_concurrent_update_session_b.sql` | 前の処理が完了した後に在庫の最終状態を確認する |
| `006_isolation_observation.sql` | 分離レベルごとの観察メモ用SQL |

## 5. 逐次実行手順
| step | 操作 |
|---|---|
| 1 | `BEGIN;` を実行する |
| 2 | 対象商品の在庫を更新する |
| 3 | `pg_locks` で現在のセッションが保持するロックを確認する |
| 4 | `ROLLBACK;` を実行する |
| 5 | 在庫が実行前の値へ戻ったことを確認する |

## 6. 分離レベル表設計
| isolation level | dirty read | non-repeatable read | phantom read | 観察方針 |
|---|---|---|---|---|
| READ COMMITTED | 防止 | 起こり得る | 起こり得る | 設定値と特徴を確認する |
| REPEATABLE READ | 防止 | 防止 | PostgreSQLでは防止相当 | トランザクション内の読み取り固定を確認 |
| SERIALIZABLE | 防止 | 防止 | 防止 | 最も厳格な分離レベルとして確認 |

## 7. 確認手順
1. schemaとseedを投入する
2. `003_commit_rollback.sql` でcommit/rollback前後の状態を記録する
3. 1つのpsqlセッションで更新とロック状態確認を順番に実行する
4. rollback後の在庫を記録する
5. 分離レベル表に観察結果を追記する

## 8. 完了条件

- commitとrollbackの違いをデータ状態で説明できる
- 更新時に取得されるロックとrollback後の状態を確認できる
- 業務処理とトランザクション境界を決める理由を説明できる

## 9. 安全性

- 教材DB以外では実行しない
- 破壊操作はseed済み教材データに限定する
- psqlセッションは1つだけ使用し、各操作で必ずcommitまたはrollbackして途中状態を放置しない
