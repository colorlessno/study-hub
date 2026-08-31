# web18 詳細設計
## SeedとMigration

## 1. 実装対象

Docker ComposeでPostgreSQLを起動し、Prisma schemaからMigrationを作成・適用した後、再実行可能なSeedで学習用データを投入する。

```text
src/backend/src/studyweb/systems/web18_seed_and_migration/
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── package.json
└── prisma/
    ├── schema.prisma
    ├── seed.ts
    └── migrations/       # migrate実行時に生成される成果物
```

| ファイル・サービス | 役割 |
|---|---|
| `.env.example` | `DATABASE_URL`の設定例 |
| `docker-compose.yml` | PostgreSQL、migrate、seedの実行単位を定義する |
| `schema.prisma` | datasource、Prisma Client、DBモデルを定義する |
| `seed.ts` | CategoryとTaskの初期データを投入する |
| `migrations/` | Migration実行時に生成されるSQLと履歴を保持する |

## 2. Docker Compose設計

| service | 役割 | 依存条件 |
|---|---|---|
| `db` | PostgreSQL 16を起動する | なし |
| `migrate` | `npx prisma migrate deploy`で保存済みMigrationを適用する | `db`がhealthy |
| `seed` | `npx prisma db seed`を実行する | `db`がhealthy |

ホストの15418番をコンテナの5432番へ公開する。DBデータはnamed volume `web18_db`へ保存する。healthcheckは5秒間隔、タイムアウト3秒、最大10回とする。

既定値はユーザー`postgres`、パスワード`postgres`、DB名`web18`である。学習用のローカル設定であり、本番資格情報として使用しない。

## 3. Prisma schema

### 3.1 Category

| フィールド | Prisma型 | 制約・用途 |
|---|---|---|
| `id` | String | 主キー、`cuid()`で生成 |
| `name` | String | 一意、Seedのupsert条件 |
| `tasks` | Task[] | Taskとの1対多relation |

### 3.2 Task

| フィールド | Prisma型 | 制約・用途 |
|---|---|---|
| `id` | String | 主キー、`cuid()`で生成 |
| `title` | String | タスク名 |
| `done` | Boolean | 既定値false |
| `categoryId` | String | Categoryへの外部キー |
| `category` | Category | `categoryId`から`Category.id`を参照 |

```text
Category 1 ─── * Task
```

## 4. Migration設計

```text
DATABASE_URLを設定
  ↓
PostgreSQLのhealthcheck成功
  ↓
prisma migrate deploy
  ↓
prisma/migrationsの未適用SQLを順にDBへ適用
```

StudyHubの学習操作では、Git管理済みの`prisma/migrations/20260823075612_studyhub/migration.sql`を適用する。新しいMigrationを作成する`prisma migrate dev`は設計変更時の開発作業であり、StudyHubの実行操作には含めない。

## 5. Seed設計

1. Prisma Clientを生成・接続する。
2. Category `Frontend`をnameでupsertする。
3. Category `Backend`をnameでupsertする。
4. 既存Taskを`deleteMany()`ですべて削除する。
5. 2件のTaskを`createMany()`で作成する。
6. 成功・失敗のどちらでもPrisma Clientを切断する。

| title | category | done |
|---|---|---|
| `CSSの読み込みを確認する` | Frontend | false |
| `Prisma migrationを実行する` | Backend | false |

Categoryは一意なnameで再利用し、Taskは全削除後に同じ2件を作る。このためSeedを再実行してもCategoryやTaskが増え続けない。ただし、既存Taskを保持したい環境では使用しない。

## 6. コマンドIF

| コマンド | 入力 | 出力・副作用 |
|---|---|---|
| `npx prisma migrate deploy` | 保存済みMigration、DATABASE_URL | 未適用MigrationのDB反映 |
| `npx prisma migrate status` | 保存済みMigration、DATABASE_URL | 適用状態の表示 |
| `npx prisma db seed` | `prisma.seed`設定 | CategoryとTaskの初期投入 |
| `npm run seed` | package script | `tsx prisma/seed.ts`を直接実行 |
| `psql -c SELECT ...` | DB接続とSQL | Category別件数とTask・Category対応の表示 |

HTTP API、アプリ画面、AI処理、認証・認可、監査ログは扱わない。

## 7. エラー設計

| 状況 | 確認箇所 | 対処 |
|---|---|---|
| DBが起動していない | Docker Composeとhealthcheck | `db`のログと状態を確認する |
| `DATABASE_URL`が不正 | Prisma CLIの接続エラー | host、port、DB名、資格情報を確認する |
| schemaに構文不備がある | Prisma CLIの検証エラー | `schema.prisma`の該当箇所を修正する |
| Migrationが失敗する | migrate serviceのログ | DB状態と生成SQLを確認する |
| Seedが失敗する | seed serviceの標準エラー | relation、接続、既存データを確認する |

Seedは例外をConsoleへ出し、終了コード1で終了する。

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | `db`を起動する | PostgreSQLがhealthyになる |
| `CHK-002` | Migrationを実行する | CategoryとTaskのテーブルが作成される |
| `CHK-003` | Seedを実行する | Category 2件、Task 2件が存在する |
| `CHK-004` | Seedを再実行する | CategoryとTaskの件数が増えない |
| `CHK-005` | 「DB内容と件数を表示」を実行する | Category別件数とTask・Category対応を確認できる |
| `CHK-006` | 不正なDATABASE_URLで実行する | 接続エラーになり、処理が成功扱いにならない |

## 9. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| DB・実行サービス・永続volume | `docker-compose.yml` |
| 接続文字列の例 | `.env.example` |
| モデルとrelation | `prisma/schema.prisma` |
| 再実行可能な初期投入 | `prisma/seed.ts` |
| Seedコマンド | `package.json` |

学習手順、故障演習、完了条件は[`doc/learning_notes/web18_seed_and_migration/README.md`](../learning_notes/web18_seed_and_migration/README.md)を参照する。
