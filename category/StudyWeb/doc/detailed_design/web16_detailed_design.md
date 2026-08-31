# web16 詳細設計
## Prisma Task CRUD

## 1. 実装対象

NestJS、Prisma、PostgreSQLを使い、Task一モデルの登録、一覧、1件取得、更新、削除を実装する。StudyHubから各APIを個別に選択でき、入力値とAPI応答を画面内で確認できる構成とする。

```text
src/backend/src/studyweb/systems/web16_prisma_task_crud/
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── prisma.service.ts
    └── tasks/
        ├── tasks.controller.ts
        ├── tasks.service.ts
        └── dto/
            ├── create-task.dto.ts
            └── update-task.dto.ts
```

| モジュール | 役割 |
|---|---|
| `main.ts` | NestJSアプリの生成、Global ValidationPipe、3000番での待受 |
| `AppModule` | ControllerとServiceとPrismaServiceの登録 |
| `PrismaService` | Prisma Clientの提供とModule初期化時のDB接続 |
| `TasksController` | CRUD用HTTPルートの提供 |
| `TasksService` | PrismaによるTask操作と存在確認 |
| DTO | 作成・更新入力の型と制約の定義 |
| `schema.prisma` | TaskモデルとPostgreSQL接続の定義 |

## 2. 実行環境

Docker Composeは次の順に利用する。

1. `db`サービスでPostgreSQL 16を起動する。
2. `migrate`サービスで保存済みMigrationを`prisma migrate deploy`により適用する。
3. `backend`サービスを起動し、ホスト13016番をコンテナ3000番へ公開する。
4. 終了時は`docker compose down --remove-orphans`でこのテーマのサービスを停止する。named volume `web16_db`は保持する。

DBのホスト公開ポートは15416番である。コンテナ内の接続先は`db:5432`とし、`DATABASE_URL`は環境変数または既定の学習用接続文字列から取得する。

## 3. API仕様

| メソッド | パス | 処理 | 成功ステータス |
|---|---|---|---:|
| POST | `/tasks` | Task作成 | 201 |
| GET | `/tasks` | 作成日時の降順で一覧取得 | 200 |
| GET | `/tasks/:id` | ID指定で1件取得 | 200 |
| PATCH | `/tasks/:id` | 指定項目だけ更新 | 200 |
| DELETE | `/tasks/:id` | Task削除 | 200 |

### 3.1 作成入力

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| `title` | string | 必須 | 空文字不可、100文字以内 |

### 3.2 更新入力

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| `title` | string | 任意 | 100文字以内 |
| `done` | boolean | 任意 | booleanのみ |

Global ValidationPipeは`whitelist: true`と`forbidNonWhitelisted: true`を使用し、DTOにないフィールドを400で拒否する。

## 4. Taskモデル

| フィールド | Prisma型 | 制約・生成方法 |
|---|---|---|
| `id` | String | 主キー、`cuid()`で生成 |
| `title` | String | 必須 |
| `done` | Boolean | 既定値false |
| `createdAt` | DateTime | `now()`で生成 |
| `updatedAt` | DateTime | 更新時に自動更新 |

API応答では日時をJSONのISO 8601文字列として返す。

## 5. 処理設計

### 5.1 登録と一覧

- 登録は`prisma.task.create()`へtitleを渡す。
- 一覧は`prisma.task.findMany()`を使い、`createdAt: "desc"`で並べる。

### 5.2 1件取得、更新、削除

`findOne()`は`findUnique()`の結果がない場合に`NotFoundException("task_not_found")`を送出する。更新と削除は先に`findOne()`で存在確認してから`update()`または`delete()`を実行する。削除成功時は`{ "deleted": true, "id": "..." }`を返す。

## 6. エラー設計

| 状況 | ステータス | 応答・確認箇所 |
|---|---:|---|
| DTOの型、必須、長さ、未定義項目の違反 | 400 | NestJS標準ValidationPipe応答 |
| IDに対応するTaskがない | 404 | message `task_not_found` |
| DB未起動、Migration未適用、接続失敗 | 500または起動失敗 | API・Docker・Prismaのログ |

IDの文字列形式自体は検証しない。任意の文字列を検索し、該当データがなければ404とする。独自の`validation_failed`や`database_error`フィールドは追加しない。

## 7. 対象外

認証、ユーザー別データ管理、複雑な検索、フロントエンド画面、監査ログ、AI処理は扱わない。

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | DB、Migration、APIを順に起動する | `GET /tasks`が200を返す |
| `CHK-002` | titleを指定して登録する | 201でid、done=false、日時を返し、DBへ保存される |
| `CHK-003` | 一覧と1件表示を実行する | 登録データを取得できる |
| `CHK-004` | titleまたはdoneを更新する | 指定項目とupdatedAtが更新される |
| `CHK-005` | 対象を削除する | deleted=trueとIDを返し、再取得は404になる |
| `CHK-006` | 不正入力と存在しないIDを送る | それぞれ400と404になる |
| `CHK-007` | 停止後に再起動する | volumeに保存されたデータを再取得できる |

## 9. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| DB・Migration・API・永続volume | `docker-compose.yml` |
| Taskモデル | `prisma/schema.prisma`、`prisma/migrations/` |
| 入力検証とHTTPルート | `src/main.ts`、`src/tasks/tasks.controller.ts`、`src/tasks/dto/` |
| CRUDと存在確認 | `src/tasks/tasks.service.ts` |
| DB接続 | `src/prisma.service.ts` |

学習手順と確認方法は[`doc/learning_notes/web16_prisma_task_crud/README.md`](../learning_notes/web16_prisma_task_crud/README.md)を参照する。
