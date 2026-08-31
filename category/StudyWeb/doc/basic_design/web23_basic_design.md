# web23 基本設計
## Next.js App Router のページとレイアウト

---

## 1. システム構成設計

### 1.1 全体構成

```text
Next.js App Router
  ├─ app/layout.tsx
  ├─ app/page.tsx
  ├─ app/about/page.tsx
  └─ app/tasks/page.tsx
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `layout.tsx` | 共通レイアウト |
| `page.tsx` | トップページ |
| `about/page.tsx` | Aboutページ |
| `tasks/page.tsx` | Tasksページ |
| `Link` | ページ遷移 |

---

## 2. 主要設計方針

- App Router のファイルベースルーティングを使う
- 共通ヘッダーとフッターは `layout.tsx` に置く
- ページ遷移には Next.js の `Link` を使う
- APIやDBは扱わず、ページ構成の理解に集中する

---

## 3. IF仕様

### 3.1 ルーティングIF

| パス | 画面 | 役割 |
|---|---|---|
| `/` | トップページ | サンプル概要 |
| `/about` | Aboutページ | 説明 |
| `/tasks` | Tasksページ | 固定タスク表示 |

---

## 4. 処理フロー

```text
Next.js起動
  ↓
layout.tsx が共通枠を提供
  ↓
URLに応じて page.tsx を表示
  ↓
Linkでページ遷移
```

---

## 5. データ設計

DBは使用しない。Tasksページの表示は固定配列でよい。

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- 存在しないページは Next.js 標準の 404 とする
- Server Component / Client Component の違いを README に補足する

---

## 8. 非機能・運用設計

- Next.js + TypeScript を使う
- App Router を使う
- `npm run dev` で起動できる

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| Framework | Next.js |
| Routing | App Router |
| 言語 | TypeScript |

---

## 10. 画面一覧

| 画面名 | 目的 |
|---|---|
| トップページ | 概要表示 |
| Aboutページ | 説明表示 |
| Tasksページ | 固定一覧表示 |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| トップ表示 | `/` |
| About遷移 | `/about` |
| Tasks遷移 | `/tasks` |

---

## 13. 画面遷移図

```text
/
├─ /about
└─ /tasks
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| 共通ヘッダー | navigation | Link |
| メイン領域 | page | 各ページ内容 |
| 共通フッター | footer | 補足 |

---

## 15. シーケンス図

```text
学習者 -> Next.js: URLアクセス
Next.js -> layout.tsx: 共通レイアウト
Next.js -> page.tsx: 対応ページ
Next.js -> 学習者: HTML表示
```
