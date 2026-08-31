# web16 Prismaによるタスクの登録・参照・更新・削除

NestJS、Prisma、PostgreSQLでTaskの作成・一覧・1件取得・更新・削除を実装し、単一モデルのCRUDを学ぶテーマです。

## このテーマでできるようになること

- タスクの登録・一覧表示・1件表示・更新・削除を一通り実行できる
- 不正な入力では400、存在しないタスクでは404が返ることを確認できる
- 各API操作と、Prismaのcreate・find・update・delete処理の対応を確認できる
- 確認終了後にDockerコンテナを停止できる

## 事前条件

- Docker Engineが起動していること
- 13016番と15416番が利用できること
- 実行対象が学習用DBであること

## 最初に取り組むこと

次の順番で確認する。

1. StudyHubでDB、Migration、バックエンドを起動し、タスクの登録、一覧表示、1件表示、更新、削除を順に実行する。
2. 各操作のHTTPメソッドとCreate、Read、Update、Deleteを対応付ける。
3. 更新前に対象を取得する処理を辿り、存在しないIDを区別する理由を確認する。
4. 登録時と更新時の応答を比較し、`createdAt`と`updatedAt`を設定する処理をDB構造の定義と実装で確認する。

## 起動方法

StudyHubでは「起動」を押し、5種類のAPI操作を順に選んで「実行する」を押します。終了時は「停止」を押します。

単体で確認する場合は、`category/StudyWeb/src/backend/src/studyweb/systems/web16_prisma_task_crud`で実行します。

```bat
docker compose up -d db
docker compose run --rm migrate
docker compose up -d backend
docker compose ps
```

終了時はvolumeを残して`docker compose down`とします。

## 登録・参照・更新・削除の確認

```bat
curl.exe -i -X POST http://localhost:13016/tasks -H "Content-Type: application/json" -d "{\"title\":\"Prisma CRUD\"}"
curl.exe -i http://localhost:13016/tasks
curl.exe -i http://localhost:13016/tasks/TASK_ID
curl.exe -i -X PATCH http://localhost:13016/tasks/TASK_ID -H "Content-Type: application/json" -d "{\"done\":true}"
curl.exe -i -X DELETE http://localhost:13016/tasks/TASK_ID
```

`TASK_ID`は作成結果のidへ置き換えます。

## 観察ポイント

- 作成時にid、done=false、createdAt、updatedAtが設定されるか
- 一覧がcreatedAtの降順か
- PATCHで指定したフィールドだけ更新されるか
- 存在しないIDのGET、PATCH、DELETEが404になるか
- titleの101文字以上や未定義フィールドが400になるか
- 削除結果が`deleted: true`とIDを返すか

## 自分の言葉で説明する

- Controller、Service、Prismaの役割を説明する。
- POSTとPATCHで異なるDTOを使う理由を説明する。
- 削除前に存在確認する利点を説明する。

## うまく動かないとき

- dbがhealthyにならない場合は`docker compose logs db`を確認します。
- backendが起動しない場合はMigrationとDATABASE_URLを確認します。
- 400の場合はJSONの型とDTO制約、404の場合はIDを確認します。
