# db04 基本設計
## トランザクション・ロック・分離レベル

## 0. 関連要件

- `../requirements/db04_transaction_lock_isolation_requirements.md`

## 1. 設計目的
注文処理と在庫減算を題材に、commit、rollback、lock、分離レベルを一つのセッションで順番に観察できる教材にする。
## 2. 対象範囲

- ACID
- BEGIN / COMMIT / ROLLBACK
- 注文処理と在庫減算
- 更新時のロック状態
- dirty read、non-repeatable read、phantom read
- 分離レベル比較
## 3. 成果物構成

```text
category/StudyDB/
  src/apps/db04_transaction_lock_isolation/
    sql/
      001_schema.sql
      002_seed.sql
      003_commit_rollback.sql
      004_concurrent_update_session_a.sql
      005_concurrent_update_session_b.sql
      006_isolation_observation.sql
    scripts/
      lock-conflict-demo.mjs
  doc/learning_notes/db04_transaction_lock_isolation/
    README.md
    docs/
      transaction_log.md
      concurrent_update_log.md
      isolation_matrix.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| 注文処理SQL | 注文処理、在庫減算、明細作成 |
| 失敗SQL | 処理途中で制約違反を起こすSQL |
| ロック観察SQL | 1セッションで在庫更新、ロック確認、rollbackを順に実行するSQL |
| 分離レベル表 | READ COMMITTED、REPEATABLE READ など |

## 5. 出力
| 出力 | 内容 |
|---|---|
| transaction log | commit / rollback 前後のデータ状態 |
| lock観察ログ | 更新時に取得されたロックとrollback後の状態 |
| 分離レベル比較表 | 起こり得る読み取り現象の違い |

## 6. 処理方針
1. 教材DBへ注文と在庫の表を作る
2. 正常系トランザクションを実行する
3. 途中失敗を発生させ rollback を確認する
4. 1セッションで更新直後のロック状態を確認する
5. rollback後の在庫を記録する
6. 分離レベルごとの違いを表で整理する

## 7. 確認観点

- commit と rollback の違いをデータ状態で説明できるか
- 更新時のロックとrollbackの関係を説明できるか
- トランザクション境界を業務処理単位で考えられるか

## 8. 後続工程への引き継ぎ

詳細設計では、単一セッションで順番に実行するSQLと観察ログの書式を定義する。
