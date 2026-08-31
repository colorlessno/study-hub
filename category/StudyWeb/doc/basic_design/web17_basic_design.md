# web17 基本設計
## User と Task のリレーション

---

## 1. システム構成設計

### 1.1 全体構成

```text
HTTP Client
  ↓
NestJS API
  ├─ UsersController / UsersService
  ├─ TasksController / TasksService
  └─ PrismaService
      ↓
PostgreSQL
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| UsersController | User API の入口 |
| UsersService | User 作成・取得 |
| TasksController | Task API の入口 |
| TasksService | Userに紐づくTask作成・取得 |
| Prisma schema | User:Task の 1:N を定義 |

---

## 2. 主要設計方針

### 2.1 リレーション設計方針

- User は複数の Task を持てる
- Task は必ず1人の User に紐づく
- 関連データ取得には Prisma の `include` を使う

### 2.2 API設計方針

- User作成後に、その User ID を使って Task を作成する
- 存在しない User ID への Task 作成はエラーにする

---

## 3. IF仕様

### 3.1 エンドポイント一覧

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/users` | User作成 |
| GET | `/users` | User一覧 |
| GET | `/users/:id` | User詳細とTask一覧 |
| POST | `/tasks` | User指定でTask作成 |
| GET | `/tasks` | Task一覧とUser情報 |

### 3.2 リクエスト項目

| API | 項目 | 内容 |
|---|---|---|
| POST `/users` | `name`, `email` | User作成 |
| POST `/tasks` | `title`, `userId` | Task作成 |

---

## 4. 処理フロー

```text
User作成
  ↓
User ID取得
  ↓
Task作成時に userId を指定
  ↓
Prisma が外部キーで関連保存
  ↓
User詳細でTask一覧を取得
```

---

## 5. データ設計

| テーブル | 主な保持内容 |
|---|---|
| `User` | ユーザー名、メールアドレス |
| `Task` | タイトル、完了状態、userId |

### 5.1 リレーション

- `User` 1 : N `Task`
- `Task.userId` は `User.id` を参照する

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- 存在しないUserへのTask作成は 404 とする
- email は重複しない設計にする
- 関連削除は学習範囲外とし、READMEに注意を書く

---

## 8. 非機能・運用設計

- Docker Compose で PostgreSQL を起動する
- Prisma migration で relation を作成する
- README に relation の確認手順を記載する

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| API | NestJS |
| ORM | Prisma |
| DB | PostgreSQL |
| コンテナ | Docker Compose |

---

## 10. 画面一覧

画面は持たない。APIで関連を確認する。

---

## 11. 権限制御

認証・認可は扱わない。User は認証ユーザーではなく関連学習用データとして扱う。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| User作成 | `POST /users` |
| Task作成 | `POST /tasks` に `userId` を指定 |
| 関連確認 | `GET /users/:id` |

---

## 13. 画面遷移図

画面遷移はない。

---

## 14. 画面項目定義

画面項目はない。API項目は IF仕様に記載する。

---

## 15. シーケンス図

```text
Client -> UsersController: POST /users
UsersService -> Prisma: User作成
Client -> TasksController: POST /tasks userId
TasksService -> Prisma: User存在確認 + Task作成
Client -> UsersController: GET /users/:id
UsersService -> Prisma: include tasks
```
