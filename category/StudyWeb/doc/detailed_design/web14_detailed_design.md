# web14 詳細設計
## NestJS POST API

## 1. 実装対象

NestJSのController、Service、DTO、ValidationPipeを使い、タスク作成風のJSONを返すPOST APIを実装する。データは永続化しない。

```text
src/backend/src/studyweb/systems/web14_nest_post_api/
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts
    ├── app.module.ts
    └── tasks/
        ├── tasks.module.ts
        ├── tasks.controller.ts
        ├── tasks.service.ts
        └── dto/
            └── create-task.dto.ts
```

| モジュール | 役割 |
|---|---|
| `main.ts` | アプリ生成、Global ValidationPipe、ループバックアドレスと指定ポートでの起動 |
| `AppModule` | `TasksModule`をルートへ組み込む |
| `TasksModule` | ControllerとServiceを登録する |
| `TasksController` | `POST /tasks`を受け、検証済みDTOをServiceへ渡す |
| `TasksService` | IDと作成時刻を加えたレスポンスを生成する |
| `CreateTaskDto` | titleとdescriptionの型・制約を定義する |

## 2. 起動とValidationPipe

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
})
```

| オプション | 動作 |
|---|---|
| `whitelist: true` | DTOにデコレーター定義がないプロパティを許可対象から外す |
| `forbidNonWhitelisted: true` | 未定義プロパティを含むリクエストを400エラーにする |

ValidationPipeはGlobal Pipeとして全ルートへ適用する。ポートは`process.env.PORT`を数値化し、未指定時は3000番とする。待受先は`127.0.0.1`に限定する。StudyHubは43314番を指定し、`GET /tasks/guide`を起動確認に使う。

## 3. API仕様

### GET `/tasks/guide`

リクエストbodyを持たず、200でテーマ名、対象操作`POST /tasks`、DBへ保存しないことを示す説明を返す。入力検証やタスク作成は行わない。

### POST `/tasks`

| 項目 | 内容 |
|---|---|
| HTTPメソッド | POST |
| Content-Type | `application/json` |
| 成功ステータス | 201（NestJSの`@Post()`標準） |
| Controller入力 | `@Body() dto: CreateTaskDto` |
| 永続化 | なし |

### リクエスト

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| `title` | string | 必須 | 空文字不可、最大80文字 |
| `description` | string | 任意 | 最大200文字 |

`title`は`@IsString()`、`@IsNotEmpty()`、`@MaxLength(80)`、descriptionは`@IsOptional()`、`@IsString()`、`@MaxLength(200)`で検証する。

### 成功レスポンス

| フィールド | 型 | 値・生成方法 |
|---|---|---|
| `id` | string | ``task-${Date.now()}`` |
| `title` | string | DTOの入力値 |
| `description` | string | 入力値。未指定時は空文字 |
| `createdAt` | string | `new Date().toISOString()` |

```json
{
  "id": "task-1767225600000",
  "title": "DTOを確認する",
  "description": "ValidationPipeを試す",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

## 4. 処理フロー

```text
POST /tasks
  ↓
JSON bodyを解析
  ↓
Global ValidationPipe
  ├─ NG → NestJS標準の400応答
  └─ OK
      ↓
TasksController.create(dto)
      ↓
TasksService.create(dto)
      ↓
ID・作成時刻を追加して201応答
```

## 5. エラー応答

独自のerror_codeは定義せず、NestJSとclass-validatorの標準エラー形式を使用する。

| 条件 | ステータス | 主な理由 |
|---|---|---|
| title未指定・空文字 | 400 | `IsNotEmpty`等に違反 |
| titleが81文字以上 | 400 | `MaxLength(80)`に違反 |
| descriptionが201文字以上 | 400 | `MaxLength(200)`に違反 |
| フィールドの型がstring以外 | 400 | `IsString`に違反 |
| DTO未定義のフィールドを含む | 400 | `forbidNonWhitelisted`により拒否 |
| JSON構文が不正 | 400 | HTTP body parserが拒否 |

## 6. データ・セキュリティ設計

- データベース、ファイル永続化、AI処理は使用しない。
- 認証・認可と監査ログは扱わない。
- 受信可能なフィールドをDTOで制限し、余分な入力を拒否する。
- IDは学習用の時刻ベース文字列であり、分散環境での一意性は保証しない。
- 正常レスポンスは生成後に保持せず、再取得APIも提供しない。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | `GET /tasks/guide`を呼ぶ | 200でテーマと非永続化の説明を返す |
| `CHK-002` | titleだけでPOSTする | 201、descriptionが空文字のJSONを返す |
| `CHK-003` | titleとdescriptionでPOSTする | 入力値を含む201応答を返す |
| `CHK-004` | titleなしでPOSTする | 400応答になる |
| `CHK-005` | titleを81文字にする | 400応答になる |
| `CHK-006` | 未定義フィールドを追加する | 400応答になる |
| `CHK-007` | 不正なJSONを送る | 400応答になる |
| `CHK-008` | `npm run build`を実行する | NestJSのビルドが成功する |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| Global ValidationPipe | `src/main.ts` |
| モジュール構成 | `src/app.module.ts`、`src/tasks/tasks.module.ts` |
| 案内・POSTルート | `src/tasks/tasks.controller.ts` |
| レスポンス生成 | `src/tasks/tasks.service.ts` |
| DTO制約 | `src/tasks/dto/create-task.dto.ts` |

学習手順、故障演習、完了条件は[`doc/learning_notes/web14_nest_post_api/README.md`](../learning_notes/web14_nest_post_api/README.md)を参照する。
