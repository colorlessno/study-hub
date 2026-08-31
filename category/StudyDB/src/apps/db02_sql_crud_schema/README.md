# db02 SQLの基本操作とテーブル設計

共通PostgreSQL環境を使って、検索・登録・更新・削除、テーブル結合、制約違反を確認する教材です。すべてリポジトリルートから実行します。

## 起動と実行順

```cmd
set STUDYDB_PORT=0
docker compose -p studyhub-db02 -f category/StudyDB\src\apps\common\docker-compose.yml up -d --wait --wait-timeout 60 db
category/StudyDB\src\apps\common\scripts\run-sql.cmd db02 sql\001_schema.sql studyhub-db02
category/StudyDB\src\apps\common\scripts\run-sql.cmd db02 sql\002_seed.sql studyhub-db02
category/StudyDB\src\apps\common\scripts\run-sql.cmd db02 sql\003_crud_examples.sql studyhub-db02
category/StudyDB\src\apps\common\scripts\run-sql.cmd db02 sql\004_join_examples.sql studyhub-db02
```

`005_constraint_errors.sql` は意図的にエラーを起こします。StudyHubからは制約違反を1件ずつ選んで実行できます。

自動検証だけを実行する場合:

```cmd
rtk node category\StudyDB\scripts\validate-studydb.mjs db02
```

停止時は、db02専用環境だけを削除します。

```cmd
docker compose -p studyhub-db02 -f category/StudyDB\src\apps\common\docker-compose.yml down --volumes --remove-orphans
```
