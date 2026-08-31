# web22 基本設計
## TanStack Query によるAPIデータ取得

---

## 1. システム構成設計

### 1.1 全体構成

```text
React App
  ├─ QueryClientProvider
  └─ TaskList
      └─ useQuery
          ↓
        GET /tasks
          ↓
        API
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `QueryClientProvider` | TanStack Query の共有設定 |
| `TaskList` | `useQuery` で一覧取得 |
| `tasksApi` | fetch 処理の分離 |
| Backend API | タスク一覧JSONを返す |

---

## 2. 主要設計方針

### 2.1 データ取得方針

- `useQuery` でタスク一覧を取得する
- loading / error / data を TanStack Query の状態として扱う
- 再取得ボタンで `refetch` を確認する

### 2.2 キャッシュ学習方針

- fetch 直書きとの違いを README に説明する
- キャッシュにより再表示時の挙動が変わることを確認する

---

## 3. IF仕様

### 3.1 Query IF

| 項目 | 内容 |
|---|---|
| queryKey | `['tasks']` |
| queryFn | `fetchTasks` |
| data | `Task[]` |
| error | 取得失敗 |

### 3.2 API IF

| メソッド | パス | 役割 |
|---|---|---|
| GET | `/tasks` | タスク一覧取得 |

---

## 4. 処理フロー

```text
React表示
  ↓
QueryClientProvider 初期化
  ↓
TaskList が useQuery 実行
  ↓
GET /tasks
  ↓
loading / error / data に応じて表示
  ↓
refetch で再取得
```

---

## 5. データ設計

| データ | 型 | 用途 |
|---|---|---|
| Task | `{ id, title, done }` | 一覧表示 |
| Query cache | TanStack Query 管理 | API結果キャッシュ |

DBは必須にしない。

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- APIエラー時は error 表示を行う
- `QueryClientProvider` 未設定時のエラーを避ける
- queryKey を固定し、キャッシュ対象を分かりやすくする

---

## 8. 非機能・運用設計

- React + TypeScript + TanStack Query を使う
- API URL は設定値として管理する
- キャッシュ確認手順を README に記載する

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| Frontend | React |
| 型 | TypeScript |
| データ取得 | TanStack Query |
| 通信 | Fetch API |
| API | NestJS または簡易API |

---

## 10. 画面一覧

| 画面名 | 目的 | 備考 |
|---|---|---|
| Queryタスク一覧 | useQuery とキャッシュを確認 | 再取得ボタンあり |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 一覧取得 | useQueryで表示 |
| 再取得 | refetch実行 |
| エラー確認 | API停止時の表示 |

---

## 13. 画面遷移図

```text
Queryタスク一覧
  ├─ loading
  ├─ success
  └─ error
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| loading表示 | text | 取得中 |
| タスク一覧 | list | data |
| エラー表示 | alert | error |
| 再取得ボタン | button | refetch |

---

## 15. シーケンス図

```text
TaskList -> TanStack Query: useQuery
TanStack Query -> API: GET /tasks
API -> TanStack Query: Task[]
TanStack Query -> TaskList: data/cache state
TaskList -> 学習者: 一覧表示
```
