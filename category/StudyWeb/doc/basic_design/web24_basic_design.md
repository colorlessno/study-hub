# web24 基本設計
## Next.js サーバー側データ取得

---

## 1. システム構成設計

### 1.1 全体構成

```text
Browser
  ↓
Next.js Server Component
  ↓ fetch
Data Source（固定JSONまたはAPI）
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `app/tasks/page.tsx` | サーバー側でデータ取得し表示 |
| Data Source | 固定JSONまたはAPI |
| README | クライアント fetch との違いを説明 |

---

## 2. 主要設計方針

- Server Component 内でデータを取得する
- 初期表示時点でデータが描画される構成にする
- Client Component は必要最小限にする
- 機密情報をブラウザへ出さない考え方を説明する

---

## 3. IF仕様

### 3.1 データ取得IF

| 呼び出し元 | 取得先 | 用途 |
|---|---|---|
| `tasks/page.tsx` | 固定JSON/API | タスク一覧表示 |

### 3.2 表示データ

| 項目 | 型 | 内容 |
|---|---|---|
| `id` | string | ID |
| `title` | string | タイトル |
| `status` | string | 状態 |

---

## 4. 処理フロー

```text
ブラウザがページ要求
  ↓
Next.js サーバー側で page.tsx 実行
  ↓
データ取得
  ↓
HTML生成
  ↓
ブラウザへ返却
```

---

## 5. データ設計

DBは必須にしない。固定JSONまたはローカルAPIのデータを扱う。

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- データ取得失敗時のエラー表示を用意する
- サーバー側とブラウザ側のログの違いを README に書く
- 外部APIを使う場合は無料で利用可能な範囲にする

---

## 8. 非機能・運用設計

- Next.js + TypeScript を使う
- App Router を使う
- SSR / Server Components の入口として最小構成にする

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| Framework | Next.js |
| データ取得 | Server Component fetch |
| 言語 | TypeScript |

---

## 10. 画面一覧

| 画面名 | 目的 |
|---|---|
| サーバー取得一覧画面 | サーバー側取得データを表示 |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| ページ表示 | サーバー側取得済みデータを見る |
| 比較 | Network タブでクライアントfetchとの違いを確認 |

---

## 13. 画面遷移図

```text
/tasks
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| 一覧 | list | サーバー側取得データ |
| エラー表示 | alert | 取得失敗時 |

---

## 15. シーケンス図

```text
Browser -> Next.js: /tasks 要求
Next.js -> Data Source: fetch
Data Source -> Next.js: data
Next.js -> Browser: HTML
```
