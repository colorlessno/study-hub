# db04 トランザクション・ロック・分離レベル

共通PostgreSQL環境を使って、commit、rollback、更新時のロック、分離レベルを逐次操作で観察する教材です。すべてリポジトリルートから実行します。

## 基本動作

```cmd
set STUDYDB_PORT=0
docker compose -p studyhub-db04 -f category/StudyDB\src\apps\common\docker-compose.yml up -d --wait --wait-timeout 60 db
category/StudyDB\src\apps\common\scripts\run-sql.cmd db04 sql\001_schema.sql studyhub-db04
category/StudyDB\src\apps\common\scripts\run-sql.cmd db04 sql\002_seed.sql studyhub-db04
category/StudyDB\src\apps\common\scripts\run-sql.cmd db04 sql\003_commit_rollback.sql studyhub-db04
```

## ロック状態の確認

1つのターミナルで次のコマンドを実行し、psqlを開きます。

```cmd
docker compose -p studyhub-db04 -f category/StudyDB\src\apps\common\docker-compose.yml exec db psql -U postgres -d studydb
```

在庫を更新し、現在のセッションが保持するロックを確認してからrollbackします。

```text
\i /work/db04_transaction_lock_isolation/sql/004_concurrent_update_session_a.sql
```

前の処理が完了した後で、在庫が実行前の値へ戻ったことを確認します。

```text
\i /work/db04_transaction_lock_isolation/sql/005_concurrent_update_session_b.sql
```

psqlセッションは1つだけ開き、すべての操作を一つずつ実行します。

自動検証は `rtk node category/StudyDB\scripts\validate-studydb.mjs db04` で実行します。停止時はdb04専用環境だけを削除します。

```cmd
docker compose -p studyhub-db04 -f category/StudyDB\src\apps\common\docker-compose.yml down --volumes --remove-orphans
```
