# web09 基本設計
## props / state / list 表示

---

## 1. システム構成設計

### 1.1 全体構成

```text
React App
  ├─ App.tsx
  ├─ FilterButtons
  ├─ TaskList
  └─ TaskItem
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `App.tsx` | タスク配列とフィルタ状態を管理 |
| `FilterButtons.tsx` | 表示条件の切替 |
| `TaskList.tsx` | タスク配列を一覧化 |
| `TaskItem.tsx` | タスク1件の表示 |

---

## 2. 主要設計方針

### 2.1 データ受け渡し方針

- 親コンポーネントがタスク配列とフィルタ状態を持つ
- 子コンポーネントへ props でデータを渡す
- 配列表示には `map` を使う

### 2.2 状態管理方針

- フィルタ条件は `useState` で管理する
- すべて、未完了、完了の3条件を用意する
- 状態管理ライブラリは使わない

---

## 3. IF仕様

### 3.1 props IF

| コンポーネント | props | 用途 |
|---|---|---|
| FilterButtons | `currentFilter`, `onChange` | フィルタ切替 |
| TaskList | `tasks` | 一覧表示 |
| TaskItem | `task` | 1件表示 |

### 3.2 イベントIF

| イベント | 処理 | 出力 |
|---|---|---|
| フィルタクリック | `filter` state 更新 | 表示タスクを切替 |

---

## 4. 処理フロー

```text
Appでタスク配列を保持
  ↓
フィルタ条件で配列をfilter
  ↓
TaskListへprops渡し
  ↓
TaskListがmapでTaskItemを生成
```

---

## 5. データ設計

| データ | 型 | 用途 |
|---|---|---|
| Task | `{ id, title, done, dueDate }` | タスク1件 |
| tasks | `Task[]` | 一覧表示 |
| filter | `'all' | 'active' | 'done'` | 表示条件 |

DBは使用しない。

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- props の型を定義する
- タスク配列が空の場合の表示を用意する
- filter の値はユニオン型で制限する

---

## 8. 非機能・運用設計

- Vite + React + TypeScript を使う
- API通信は行わない
- 親子コンポーネントの責務を明確にする

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| UI | React |
| 型 | TypeScript |
| 開発 | Vite |

---

## 10. 画面一覧

| 画面名 | 目的 | 備考 |
|---|---|---|
| タスク一覧画面 | props / state / map を確認 | `App.tsx` |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 一覧確認 | タスク一覧を見る |
| フィルタ切替 | すべて/未完了/完了を切り替える |
| 空表示確認 | 条件に合うタスクがない状態を見る |

---

## 13. 画面遷移図

```text
タスク一覧画面
  └─ フィルタ条件により同一画面内で一覧更新
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| フィルタボタン | button group | 表示条件 |
| タスク一覧 | list | filter後のタスク |
| タスク行 | item | タイトル、状態、期限 |
| 空表示 | text | 該当なしメッセージ |

---

## 15. シーケンス図

```text
学習者 -> FilterButtons: フィルタクリック
FilterButtons -> App: onChange
App -> App: filter state更新
App -> TaskList: filter済みtasksを渡す
TaskList -> TaskItem: taskを渡す
```
