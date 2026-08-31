# web20 基本設計
## 画面からPOSTしてDB保存

---

## 1. システム構成設計

### 1.1 全体構成

```text
React Frontend
  ↓ GET /tasks, POST /tasks
NestJS API
  ↓
Prisma
  ↓
PostgreSQL（Docker Compose）
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| TaskForm | タスク入力と送信 |
| TaskList | タスク一覧表示 |
| TasksController | GET/POST API |
| TasksService | DB操作 |
| PrismaService | Prisma Client |
| PostgreSQL | Task保存 |

---

## 2. 主要設計方針

### 2.1 アプリ設計方針

- 画面入力、API送信、DB保存、一覧更新を一連で確認する
- フロントとAPIの両方でタイトル必須チェックを行う
- 保存後は一覧を再取得またはstate更新する

### 2.2 環境設計方針

- Web / API / DB は Docker Compose で起動する
- API URL と DB接続情報は環境変数で管理する
- CORS を設定する

---

## 3. IF仕様

### 3.1 エンドポイント一覧

| メソッド | パス | 役割 |
|---|---|---|
| GET | `/tasks` | タスク一覧取得 |
| POST | `/tasks` | タスク作成 |

### 3.2 POSTリクエスト

| 項目 | 型 | 必須 |
|---|---|---|
| `title` | string | yes |

---

## 4. 処理フロー

```text
画面表示
  ↓
GET /tasks で一覧表示
  ↓
フォーム入力
  ↓
POST /tasks
  ↓
PrismaでDB保存
  ↓
一覧を更新
```

---

## 5. データ設計

| テーブル | 主な保持内容 |
|---|---|
| `Task` | タイトル、完了状態、作成更新日時 |

| Frontend state | 用途 |
|---|---|
| `tasks` | 一覧表示 |
| `title` | フォーム入力 |
| `error` | エラー表示 |

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- 空タイトルは送信前に止める
- API側でも空タイトルを400にする
- DB接続失敗時はエラーをログに出す
- 画面には通信失敗メッセージを表示する

---

## 8. 非機能・運用設計

- Docker Compose で一式起動できる
- migration 手順を README に記載する
- ローカル学習環境で完結する

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| Frontend | React + TypeScript |
| API | NestJS |
| ORM | Prisma |
| DB | PostgreSQL |
| 起動 | Docker Compose |

---

## 10. 画面一覧

| 画面名 | 目的 | 備考 |
|---|---|---|
| タスク管理画面 | 作成と一覧更新を確認 | フォーム + 一覧 |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 一覧確認 | GET /tasks |
| 作成 | フォームからPOST |
| DB確認 | 保存後の一覧更新 |

---

## 13. 画面遷移図

```text
タスク管理画面
  ├─ 一覧表示
  ├─ 作成成功
  └─ 入力/通信エラー
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| タイトル入力 | input | Task title |
| 作成ボタン | button | POST実行 |
| エラー表示 | alert | 入力/通信エラー |
| タスク一覧 | list | DB保存済みTask |

---

## 15. シーケンス図

```text
学習者 -> React: タスク入力
React -> NestJS: POST /tasks
NestJS -> Prisma: create Task
Prisma -> PostgreSQL: INSERT
PostgreSQL -> NestJS: saved Task
NestJS -> React: JSON
React -> NestJS: GET /tasks
React -> 学習者: 一覧更新
```
