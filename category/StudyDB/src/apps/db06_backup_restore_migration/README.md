# db06 バックアップ・リストア・マイグレーション安全性

共通PostgreSQL環境を使って、backup、別DBへのrestore、migration前後確認を学ぶ教材です。すべてリポジトリルートから実行します。

## migration前の準備

```cmd
set STUDYDB_PORT=0
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml up -d --wait --wait-timeout 30 db
category/StudyDB\src\apps\common\scripts\run-sql.cmd db06 sql\001_schema.sql studyhub-db06
category/StudyDB\src\apps\common\scripts\run-sql.cmd db06 sql\002_seed.sql studyhub-db06
category/StudyDB\src\apps\common\scripts\run-sql.cmd db06 sql\checks\001_before_migration_check.sql studyhub-db06
```

## backupと別DBへのrestore

dumpはschema `db06` を作り直す内容なので、元DBへ流さず、教材用の `studydb_restore` へ復元します。

```cmd
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml exec -T db pg_dump -U postgres -d studydb --schema=db06 --file=/backups/studydb_db06_before_migration.sql
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml exec -T db psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS studydb_restore;"
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml exec -T db psql -U postgres -d postgres -c "CREATE DATABASE studydb_restore;"
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml exec -T db psql -U postgres -d studydb_restore -f /backups/studydb_db06_before_migration.sql
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml exec -T db psql -U postgres -d studydb_restore -f /work/db06_backup_restore_migration/sql/checks/003_after_restore_check.sql
```

seed直後なら `restored_customers = 3` が復元成功の証拠です。確認後は演習用DBを削除します。

```cmd
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml exec -T db psql -U postgres -d postgres -c "DROP DATABASE studydb_restore;"
```

## migration

```cmd
category/StudyDB\src\apps\common\scripts\run-sql.cmd db06 sql\migrations\001_add_customer_email.sql studyhub-db06
category/StudyDB\src\apps\common\scripts\run-sql.cmd db06 sql\migrations\002_add_order_status.sql studyhub-db06
category/StudyDB\src\apps\common\scripts\run-sql.cmd db06 sql\checks\002_after_migration_check.sql studyhub-db06
```

backupファイルは生成物としてGit管理外です。自動検証は `node category/StudyDB\scripts\validate-studydb.mjs db06` です。確認後は次のコマンドで、このテーマ専用のコンテナとボリュームを削除します。

```cmd
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml down --volumes --remove-orphans
```
