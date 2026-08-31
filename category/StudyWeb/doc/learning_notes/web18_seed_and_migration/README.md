# web18 DB変更履歴と初期データ投入

Docker Compose、PostgreSQL、Prismaを使い、DB構造の変更履歴と再実行可能な初期データ投入を学ぶテーマです。

## このテーマでできるようになること

- 保存済みのMigrationをDBへ適用し、続けて初期データを投入するSeedを実行できる
- DB内容と件数を表示し、2分類と各分類に属するタスクを確認できる
- Seedを2回実行しても、初期データの件数が増えないことを確認できる
- `schema.prisma`、`migration.sql`、`seed.ts`がそれぞれ何を定義・変更するか確認できる

## 事前条件

- Docker Desktop等のDocker Engineが起動していること
- ホストの15418番ポートが利用できること
- 実行対象が学習用DBであること

Seedは既存Taskを`deleteMany()`で削除してから2件を投入します。保持したいDBへは実行しないでください。

## 最初に取り組むこと

次の順番で確認する。

1. StudyHubでDBを起動し、「Migrationを実行」と「Migration状態を表示」を順に実行する。
2. `schema.prisma`、`migration.sql`、Migration結果を照合し、DB構造の変更とTask側の外部キーを確認する。
3. 「Seedを実行」と「DB内容と件数を表示」を実行し、`seed.ts`と登録結果を照合する。
4. SeedとDB内容表示をもう一度実行し、分類とタスクの件数が増えないことを確認する。

## 実行方法

StudyHubでは「起動」を押した後、4種類の操作を選んで実行します。終了時は「停止」を押します。

単体で確認する場合は、実装ディレクトリで実行します。

```bat
docker compose up -d db
docker compose run --rm migrate
docker compose run --rm seed
```

状態とログは次で確認します。

```bat
docker compose ps
docker compose logs db
```

作業終了時はvolumeを削除せず、`docker compose down`で停止します。

## 観察ポイント

- dbがhealthyになってからmigrateとseedが動くか
- 保存済みの`migration.sql`がDBへ適用され、Migration状態に反映されるか
- CategoryがFrontendとBackendの2件か
- Taskが2件で、それぞれ正しいCategoryを参照するか
- Seedを再実行しても件数が増えないか
- Seed失敗時に終了コードが成功扱いにならないか

## 自分の言葉で説明する

- `schema.prisma`、`migration.sql`、`seed.ts`の役割をそれぞれ1文で説明する。
- Categoryはupsert、Taskは全削除後に作成している理由を説明する。
- 学習用DBのSeedを本番DBへ実行してはいけない理由を説明する。

## うまく動かないとき

- Dockerへ接続できない場合は、Docker Engineの起動を確認します。
- dbがhealthyにならない場合は、`docker compose logs db`を確認します。
- Prisma接続エラーでは、コンテナ内のhostが`db`であることを確認します。
- 15418番が競合する場合は、使用中プロセスとポート設定を確認します。
