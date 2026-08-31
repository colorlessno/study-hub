# web17 詳細設計
## UserとTaskのリレーション

## 1. 実装対象

NestJS、Prisma、PostgreSQLを使い、User一件にTask複数件を関連付ける1対多モデルを実装する。StudyHubからUser登録・表示とTask登録・表示を個別に実行し、両方向の関連データを確認できる構成とする。

```text
src/backend/src/studyweb/systems/web17_relation_user_task/
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
    ├── users/
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   └── dto/create-user.dto.ts
    └── tasks/
        ├── tasks.controller.ts
        ├── tasks.service.ts
        └── dto/create-task.dto.ts
```

| モジュール | 役割 |
|---|---|
| `main.ts` | NestJSアプリの生成、Global ValidationPipe、3000番での待受 |
| `AppModule` | 2組のController・ServiceとPrismaServiceの登録 |
| `PrismaService` | Prisma Clientの提供とModule初期化時のDB接続 |
| `UsersController` / `UsersService` | User作成、一覧、1件取得 |
| `TasksController` / `TasksService` | Userを指定したTask作成、Task一覧 |
| DTO | User・Task作成入力の型と制約の定義 |

## 2. 実行環境

Docker Composeは、PostgreSQL 16の`db`、保存済みMigrationを適用する`migrate`、NestJS APIの`backend`を定義する。StudyHubはDB、Migration、APIの順で起動し、APIをホスト13017番、DBを15417番へ公開する。終了時は対象Composeを停止し、named volume `web17_db`は保持する。

## 3. API仕様

| メソッド | パス | 処理 | 成功ステータス |
|---|---|---|---:|
| POST | `/users` | User作成 | 201 |
| GET | `/users` | tasksを含むUser一覧 | 200 |
| GET | `/users/:id` | tasksを含むUser1件 | 200 |
| POST | `/tasks` | Userを指定してTask作成 | 201 |
| GET | `/tasks` | userを含むTask一覧 | 200 |

### 3.1 User作成入力

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| `name` | string | 必須 | 空文字不可 |
| `email` | string | 必須 | メールアドレス形式、DBで一意 |

### 3.2 Task作成入力

| フィールド | 型 | 必須 | 制約 |
|---|---|---|---|
| `title` | string | 必須 | 空文字不可 |
| `userId` | string | 必須 | 空文字不可、既存UserのID |

Global ValidationPipeは`whitelist: true`と`forbidNonWhitelisted: true`を使用し、DTOにないフィールドを400で拒否する。

## 4. データモデル

### 4.1 User

| フィールド | Prisma型 | 制約・用途 |
|---|---|---|
| `id` | String | 主キー、`cuid()`で生成 |
| `name` | String | User名 |
| `email` | String | 一意 |
| `tasks` | Task[] | 関連するTaskの配列 |

### 4.2 Task

| フィールド | Prisma型 | 制約・用途 |
|---|---|---|
| `id` | String | 主キー、`cuid()`で生成 |
| `title` | String | Task名 |
| `done` | Boolean | 既定値false |
| `userId` | String | Userへの外部キー |
| `user` | User | `userId`から参照するUser |

```text
User 1 ─── * Task
```

## 5. 処理設計

### 5.1 User処理

- 作成は`prisma.user.create({ data: dto })`を使用する。
- 一覧と1件取得は`include: { tasks: true }`を使い、UserからTaskを取得する。
- 1件取得でUserが存在しない場合は`NotFoundException("user_not_found")`を送出する。

### 5.2 Task処理

- 作成前に`userId`でUserを検索する。
- Userが存在しない場合はTaskを作成せず、404の`user_not_found`を返す。
- 作成と一覧は`include: { user: true }`を使い、TaskからUserを取得する。

## 6. エラー設計

| 状況 | ステータス | 処理 |
|---|---:|---|
| name、email、title、userIdの入力違反 | 400 | NestJS標準ValidationPipe応答 |
| User詳細またはTask作成のUserが存在しない | 404 | message `user_not_found` |
| emailがDBのunique制約に違反する | 500 | Prisma例外としてAPIログと応答を確認する |
| DB未起動、Migration未適用、接続失敗 | 500または起動失敗 | API・Docker・Prismaのログを確認する |

このテーマはrelationの学習を対象とし、Prisma例外を業務エラーへ変換する共通例外処理は実装しない。独自の`email_duplicated`や`validation_failed`フィールドは定義しない。

## 7. 対象外

認証、権限管理、多対多relation、関連削除、フロントエンド画面、監査ログ、AI処理は扱わない。

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | DB、Migration、APIを順に起動する | User一覧が200を返す |
| `CHK-002` | 一意なemailでUserを登録する | 201でUserがDBへ保存される |
| `CHK-003` | User IDを指定してTaskを2件登録する | 2件が同じUserへ関連付く |
| `CHK-004` | User一覧・1件表示を実行する | Userのtasks配列に関連Taskが含まれる |
| `CHK-005` | Task一覧を実行する | 各Taskにuserが含まれる |
| `CHK-006` | 不正emailと存在しないuserIdを送る | それぞれ400と404になる |
| `CHK-007` | DB構造を確認する | Task.userIdがUser.idへの外部キーである |

## 9. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| DB・Migration・API・永続volume | `docker-compose.yml` |
| 1対多モデルと外部キー | `prisma/schema.prisma`、`prisma/migrations/` |
| User APIと関連取得 | `src/users/users.controller.ts`、`src/users/users.service.ts` |
| Task APIとUser存在確認 | `src/tasks/tasks.controller.ts`、`src/tasks/tasks.service.ts` |
| 入力検証 | `src/main.ts`、`src/users/dto/`、`src/tasks/dto/` |

学習手順と確認方法は[`doc/learning_notes/web17_relation_user_task/README.md`](../learning_notes/web17_relation_user_task/README.md)を参照する。
