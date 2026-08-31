# web23 詳細設計
## Next.js App Routerのページとレイアウト

## 1. 実装対象

Next.js App Routerでトップ、概要、タスクの3ページを作り、共通のヘッダー・ナビゲーション・フッターをRoot Layoutから表示する。

```text
src/frontend/src/studyweb/systems/web23_next_pages_layout/
├── package.json
├── next.config.ts
├── tsconfig.json
└── app/
    ├── globals.css
    ├── layout.tsx
    ├── page.tsx
    ├── about/
    │   └── page.tsx
    └── tasks/
        └── page.tsx
```

## 2. モジュール設計

| ファイル | URL | 役割 |
|---|---|---|
| `app/layout.tsx` | 全ページ | html/body、共通ヘッダー、Link、フッター |
| `app/page.tsx` | `/` | トップページ |
| `app/about/page.tsx` | `/about` | App Routerの説明 |
| `app/tasks/page.tsx` | `/tasks` | 固定の学習タスク3件 |
| `app/globals.css` | 全ページ | 共通スタイル |
| `next.config.ts` | 実行制御 | 使用CPUを1、worker threadを無効にする |

## 3. ルーティング設計

App Routerは`app`配下のディレクトリと`page.tsx`からURLを決める。画面のLinkは次の3パスだけを参照する。

| Link表示 | `href` | 表示ファイル |
|---|---|---|
| トップ | `/` | `app/page.tsx` |
| 概要 | `/about` | `app/about/page.tsx` |
| タスク | `/tasks` | `app/tasks/page.tsx` |

`next/link`によるクライアント側ナビゲーションを使い、通常のページ全体再読込を避ける。

## 4. レイアウト設計

Root Layoutは`<html lang="ja">`と`<body>`を定義し、`children`の前後に共通要素を配置する。

```text
html
└── body
    ├── header
    │   ├── web23識別
    │   └── nav（トップ・概要・タスク）
    ├── children（選択したpage.tsx）
    └── footer
```

3ページはいずれもServer Componentのままとし、`"use client"`は付けない。

## 5. データ設計

Tasksページはファイル内の固定文字列配列3件を表示する。API通信、DB、永続保存、AI処理は使用しない。

## 6. エラー設計

定義されていないURLはNext.js標準のNot Found処理に任せる。独自の`page_not_found`応答形式、エラーページ、監査ログは実装しない。

## 7. 実行設計

| 項目 | 内容 |
|---|---|
| 開発起動 | `next dev` |
| StudyHub表示URL | `http://127.0.0.1:43223/` |
| 必要環境 | Node.js、npm |
| 停止 | StudyHubが起動したNext.jsプロセスだけを終了 |

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 3つのLinkを順に開く | `/`、`/about`、`/tasks`が表示される |
| `CHK-002` | URLとソースを比較する | 各URLが対応する`page.tsx`を使う |
| `CHK-003` | 各ページを確認する | 共通ヘッダーとフッターが残る |
| `CHK-004` | Linkで移動する | ページ全体の再読込なしで表示が切り替わる |

学習手順とVite SPAとの比較は[`doc/learning_notes/web23_next_pages_layout/README.md`](../learning_notes/web23_next_pages_layout/README.md)を参照する。
