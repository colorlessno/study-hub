# web16 基本設計
## Prisma Task CRUD

---

## 1. システム構成設計

### 1.1 全体構成

```text
HTTP Client
  ↓
NestJS API
  ├─ TasksController
  ├─ TasksService
  └─ PrismaService
      ↓
PostgreSQL（Docker Compose）
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `TasksController` | CRUD API の入口 |
| `TasksService` | Task の作成、取得、更新、削除 |
| `PrismaService` | Prisma Client の提供 |
| `schema.prisma` | Taskモデル定義 |
| `docker-compose.yml` | PostgreSQL 起動 |

---

## 2. 主要設計方針

### 2.1 CRUD設計方針

- Task 1モデルで create / read / update / delete を確認する
- APIとDBの責務を分ける
- 入力チェックはDTOで最低限行う

### 2.2 DB設計方針

- PostgreSQL は Docker Compose で起動する
- Prisma migration でテーブルを作成する
- 接続情報は `.env` で管理する

---

## 3. IF仕様

### 3.1 エンドポイント一覧

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/tasks` | Task作成 |
| GET | `/tasks` | Task一覧取得 |
| GET | `/tasks/:id` | Task詳細取得 |
| PATCH | `/tasks/:id` | Task更新 |
| DELETE | `/tasks/:id` | Task削除 |

### 3.2 Task API項目

| 項目 | 型 | 内容 |
|---|---|---|
| `id` | string | Task ID |
| `title` | string | タイトル |
| `done` | boolean | 完了状態 |
| `createdAt` | Date | 作成日時 |
| `updatedAt` | Date | 更新日時 |

---

## 4. 処理フロー

```text
HTTPリクエスト
  ↓
TasksController
  ↓
DTO検証
  ↓
TasksService
  ↓
Prisma Client
  ↓
PostgreSQL
  ↓
JSONレスポンス
```

---

## 5. データ設計

### 5.1 テーブル設計

| テーブル | 主な保持内容 |
|---|---|
| `Task` | タスクのタイトル、完了状態、作成更新日時 |

### 5.2 モデル

| フィールド | 型 | 制約 |
|---|---|---|
| `id` | String | 主キー |
| `title` | String | 必須 |
| `done` | Boolean | default false |
| `createdAt` | DateTime | default now |
| `updatedAt` | DateTime | auto update |

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- 存在しないIDは 404 を返す
- タイトル未入力は 400 を返す
- DB接続失敗時は起動ログと `.env` を確認する
- Prisma migration 未実行時の確認手順を README に記載する

---

## 8. 非機能・運用設計

- Docker Compose で PostgreSQL を起動する
- migration を再実行できる
- API確認は curl または REST Client で行う

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| API | NestJS |
| ORM | Prisma |
| DB | PostgreSQL |
| コンテナ | Docker Compose |
| 言語 | TypeScript |

---

## 10. 画面一覧

画面は持たない。APIでCRUDを確認する。

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| DB起動 | `docker compose up -d` |
| migration | Prisma migration 実行 |
| CRUD確認 | POST / GET / PATCH / DELETE を実行 |

---

## 13. 画面遷移図

画面遷移はない。

---

## 14. 画面項目定義

画面項目はない。API項目は IF仕様に記載する。

---

## 15. シーケンス図

```text
HTTP Client -> TasksController: CRUD request
TasksController -> TasksService: dto/id
TasksService -> PrismaService: query
PrismaService -> PostgreSQL: SQL
PostgreSQL -> PrismaService: result
TasksService -> HTTP Client: JSON
```
