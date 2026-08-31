# StudyDB common DB

`db02`、`db04`、`db05`、`db06` が共通利用するローカルPostgreSQL教材環境です。以下のコマンドはすべてリポジトリルートから実行します。

## 前提

- Docker Desktop が起動していること。
- serviceは `db`、databaseは `studydb`。
- user/passwordはローカル教材専用の `postgres/postgres`。
- `db01`、`db03`、`db07` は文書完結型のため対象外。

## 起動とSQL実行

```cmd
docker compose -f category/StudyDB\src\apps\common\docker-compose.yml up -d --wait --wait-timeout 30 db
category/StudyDB\src\apps\common\scripts\run-sql.cmd db02 sql\001_schema.sql
category/StudyDB\src\apps\common\scripts\run-sql.cmd db02 sql\002_seed.sql
```

`run-sql.cmd` の第1引数は教材番号、第2引数はその教材フォルダからの相対SQLパスです。スクリプト自身がComposeファイルの場所を解決するため、リポジトリルートから実行できます。

## 停止

データを次回も残す場合:

```cmd
docker compose -f category/StudyDB\src\apps\common\docker-compose.yml down
```

教材データを初期化すると決めた場合だけ、volumeも削除します。

```cmd
docker compose -f category/StudyDB\src\apps\common\docker-compose.yml down --volumes
```

## 自動検証

短い再開確認にはテーマを指定します。引数を省略すると4テーマを一括検証します。

```cmd
node category/StudyDB\scripts\validate-studydb.mjs db02
node category/StudyDB\scripts\validate-studydb.mjs
```

自動検証は通常の教材環境と分離したComposeプロジェクトを作り、終了時にコンテナとvolumeを削除します。
