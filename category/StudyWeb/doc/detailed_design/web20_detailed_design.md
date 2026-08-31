# web20 詳細設計
## 画面からPOSTしてDB保存

## 1. 実装対象

Reactの入力フォームからNestJS APIへタスクをPOSTし、Prisma経由でPostgreSQLへ永続化する。保存成功後はGETで一覧を再取得する。

```text
src/infra/compose/web20_create_task_form/
└── docker-compose.yml
src/backend/src/studyweb/systems/web20_create_task_form/backend/
├── Dockerfile
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── src/
    ├── create-task.dto.ts
    ├── main.ts
    ├── prisma.service.ts
    ├── tasks.controller.ts
    └── tasks.service.ts
src/frontend/src/studyweb/systems/web20_create_task_form/frontend/
├── Dockerfile
├── package.json
└── src/
    ├── App.tsx
    ├── main.tsx
    └── styles.css
```

## 2. モジュール設計

| モジュール | 役割 | 主な処理 |
|---|---|---|
| `App.tsx` | 作成・一覧画面 | 入力検査、POST、GETによる一覧再取得、エラー表示 |
| `CreateTaskDto` | API入力 | 文字列・必須・非空白・最大100文字を検証 |
| `TasksController` | HTTP API | `GET /tasks`と`POST /tasks`を公開 |
| `TasksService` | DB処理 | Prismaの`findMany`と`create`を呼ぶ |
| `PrismaService` | ORM接続 | Prisma Clientのライフサイクルを管理 |
| `docker-compose.yml` | 実行環境 | db、migrate、backend、frontendを定義 |

## 3. API設計

| メソッド | パス | 入力 | 成功時 |
|---|---|---|---|
| GET | `/tasks` | なし | `createdAt`降順のTask配列、HTTP 200 |
| POST | `/tasks` | `{ "title": string }` | 作成したTask、HTTP 201 |

Taskの項目は`id`、`title`、`done`、`createdAt`、`updatedAt`である。日時はJSONではISO 8601文字列として返る。

## 4. 入力検証

| 層 | ルール | 不正時 |
|---|---|---|
| React | `trim()`後が空でない | 送信せず「タイトルを入力してください。」を表示 |
| DTO | stringである | HTTP 400 |
| DTO | 空文字でない | HTTP 400 |
| DTO | 空白以外を1文字以上含む | HTTP 400 |
| DTO | 最大100文字 | HTTP 400 |
| ValidationPipe | 定義外項目を拒否 | HTTP 400 |

APIはNestJS標準のBad Request応答を使い、独自の`validation_failed`などのエラーコードは定義しない。

## 5. フロントエンド処理

1. 初期表示時に`GET /tasks`を実行する。
2. 入力をtrimし、空なら送信を止める。
3. JSONで`POST /tasks`を実行する。
4. HTTP成功時に入力欄を空にする。
5. `GET /tasks`を再実行し、DBの最新一覧を画面へ反映する。

GETまたはPOSTのHTTPエラーと通信例外は画面に表示する。GET成功時だけTask配列をstateへ保存する。

## 6. データベース設計

```prisma
model Task {
  id        String   @id @default(cuid())
  title     String
  done      Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

| 項目 | 内容 |
|---|---|
| DBMS | PostgreSQL 16 |
| DB名 | `web20` |
| ホスト公開ポート | 15420 |
| 永続化 | named volume `web20_db` |
| Migration | `npx prisma migrate deploy` |

## 7. Docker Compose起動順

```text
db起動・healthcheck成功
  ↓
migrateで保存済みMigrationを適用
  ↓
backendとfrontendを起動
  ↓
frontendからPOST、backendからDBへ保存
```

frontendは`VITE_API_URL=http://localhost:13020`、backendはCompose内の`DATABASE_URL`を使用する。

## 8. エラー設計

| 状況 | 検出箇所 | 結果 |
|---|---|---|
| 入力不正 | ReactまたはValidationPipe | 送信抑止またはHTTP 400 |
| APIのHTTPエラー | `response.ok` | 状態番号を含む保存・一覧取得失敗表示 |
| API停止・URL不正 | `fetch`例外 | 通信失敗表示 |
| DB接続・保存失敗 | Prisma/NestJS | HTTP 500、backendログへ出力 |

AI処理と監査ログ基盤は使用しない。

## 9. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 空白だけで送信する | 画面側で拒否される |
| `CHK-002` | 正しいタイトルを送信する | HTTP 201でTaskが作成される |
| `CHK-003` | POST後の通信を確認する | POSTの後にGETが実行される |
| `CHK-004` | 画面を再読込する | 作成したTaskがDBから再表示される |
| `CHK-005` | DB内容表示操作を実行する | PostgreSQLに保存済みのTaskを確認できる |

学習手順、Migration、DB確認方法は[`doc/learning_notes/web20_create_task_form/README.md`](../learning_notes/web20_create_task_form/README.md)を参照する。
