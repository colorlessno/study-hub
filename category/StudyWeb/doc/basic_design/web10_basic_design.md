# web10 基本設計
## TypeScript型つきデータモデル

---

## 1. システム構成設計

### 1.1 全体構成

```text
React App
  ├─ models/
  │   ├─ user.ts
  │   ├─ task.ts
  │   └─ article.ts
  ├─ data/sampleData.ts
  └─ App.tsx
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `models/user.ts` | User型を定義 |
| `models/task.ts` | Task型を定義 |
| `models/article.ts` | Article型を定義 |
| `data/sampleData.ts` | 型に従ったサンプルデータを定義 |
| `App.tsx` | サンプルデータを表示 |

---

## 2. 主要設計方針

### 2.1 型定義方針

- `type` または `interface` でデータの形を定義する
- 必須項目と任意項目を含める
- 状態やカテゴリにはユニオン型を使う

### 2.2 利用方針

- サンプルデータに型を付ける
- props にも型を付ける
- `any` は使用しない

---

## 3. IF仕様

### 3.1 型IF

| 型 | 主な項目 | 用途 |
|---|---|---|
| User | `id`, `name`, `email`, `role` | ユーザー表示 |
| Task | `id`, `title`, `status`, `assigneeId` | タスク表示 |
| Article | `id`, `title`, `summary`, `published` | 記事表示 |

### 3.2 コンポーネントIF

| コンポーネント | props | 用途 |
|---|---|---|
| UserCard | `user: User` | User表示 |
| TaskList | `items: Task[]` | Task一覧 |
| ArticleList | `items: Article[]` | Article一覧 |

---

## 4. 処理フロー

```text
型定義を作成
  ↓
型付きサンプルデータを作成
  ↓
Appでデータを読み込む
  ↓
propsで表示コンポーネントへ渡す
  ↓
画面表示
```

---

## 5. データ設計

| データ | 型 | 保持場所 |
|---|---|---|
| users | `User[]` | `sampleData.ts` |
| tasks | `Task[]` | `sampleData.ts` |
| articles | `Article[]` | `sampleData.ts` |

DBは使用しない。

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- 型に合わないサンプルデータはビルド時に検出する
- 任意項目は表示時に定義されていないを考慮する
- ユニオン型で許可値を制限する

---

## 8. 非機能・運用設計

- Vite + React + TypeScript を使う
- 型定義と画面表示を分離する
- 学習用に型を読みやすく保つ

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
| 型付きデータ表示画面 | 型定義と表示を確認 | `App.tsx` |

---

## 11. 権限制御

認証・認可は扱わない。`role` は型学習用の表示項目として扱う。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 型確認 | `models/` を読む |
| データ確認 | `sampleData.ts` を読む |
| 表示確認 | 画面で型付きデータを見る |

---

## 13. 画面遷移図

```text
型付きデータ表示画面
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| User一覧 | list | User型の表示 |
| Task一覧 | list | Task型の表示 |
| Article一覧 | list | Article型の表示 |

---

## 15. シーケンス図

```text
App -> sampleData: 型付きデータ読込
App -> 表示コンポーネント: props渡し
表示コンポーネント -> 学習者: データ表示
TypeScript -> 開発者: 型不一致を検出
```
