# web19 基本設計
## ReactからAPIを呼んで一覧表示

---

## 1. システム構成設計

### 1.1 全体構成

```text
ブラウザ
  ↓
React Frontend
  ↓ fetch GET /tasks
NestJS API
  ↓
固定タスクデータ
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| Frontend App | タスク一覧表示、loading/error管理 |
| Tasks API | `GET /tasks` でJSON返却 |
| Docker Compose | frontend/backend 起動 |
| README | 起動と確認手順 |

---

## 2. 主要設計方針

### 2.1 接続方針

- React から `fetch` で API を呼ぶ
- API URL は設定値として管理する
- CORS を設定し、ブラウザからAPIを呼べるようにする

### 2.2 状態管理方針

- loading / error / success を React state で管理する
- DBは必須にせず、API内固定データで接続理解を優先する

---

## 3. IF仕様

### 3.1 エンドポイント一覧

| メソッド | パス | 役割 |
|---|---|---|
| GET | `/tasks` | タスク一覧取得 |

### 3.2 レスポンス

| 項目 | 型 | 内容 |
|---|---|---|
| `id` | string | Task ID |
| `title` | string | タイトル |
| `done` | boolean | 完了状態 |

---

## 4. 処理フロー

```text
画面表示
  ↓
loading=true
  ↓
fetch GET /tasks
  ├─ 成功: tasksをstateへ保存
  └─ 失敗: errorをstateへ保存
  ↓
一覧またはエラーを表示
```

---

## 5. データ設計

DBは使用しない。API内の固定配列を返す。

| データ | 保持場所 | 用途 |
|---|---|---|
| tasks | Backend | APIレスポンス |
| loading/error/tasks | Frontend state | 画面表示 |

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- API停止時は画面にエラーを表示する
- CORSエラー時の確認手順を README に記載する
- API URL の設定誤りを切り分けられるようにする

---

## 8. 非機能・運用設計

- Docker Compose で frontend/backend を起動できる
- API URL は環境変数で管理する
- ブラウザ DevTools で通信確認できる

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| Frontend | React + TypeScript |
| API | NestJS |
| 通信 | Fetch API |
| 起動 | Docker Compose |

---

## 10. 画面一覧

| 画面名 | 目的 | 備考 |
|---|---|---|
| タスク一覧画面 | API取得結果を表示 | loading/errorあり |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 起動 | Docker Compose |
| 一覧表示 | ReactからAPI取得 |
| エラー確認 | API停止やURL変更で確認 |

---

## 13. 画面遷移図

```text
タスク一覧画面
  ├─ loading
  ├─ success
  └─ error
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| loading表示 | text | 取得中 |
| エラー表示 | alert | 取得失敗 |
| タスク一覧 | list | API結果 |

---

## 15. シーケンス図

```text
ブラウザ -> React: 画面表示
React -> NestJS API: GET /tasks
NestJS API -> React: tasks JSON
React -> ブラウザ: 一覧表示
```
