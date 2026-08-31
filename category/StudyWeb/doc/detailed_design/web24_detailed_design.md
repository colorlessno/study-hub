# web24 詳細設計
## Next.jsサーバー側データ取得

## 1. 実装対象

Next.jsのServer Componentで固定の学習データを取得し、サーバーが生成する初期HTMLへタスク一覧を含める。要件が許可する固定JSON方式を採用し、ブラウザ側の`useEffect`やAPI通信は使用しない。

```text
src/frontend/src/studyweb/systems/web24_next_server_fetch/
├── package.json
├── next.config.ts
├── tsconfig.json
└── app/
    ├── globals.css
    ├── layout.tsx
    ├── page.tsx
    └── tasks/
        └── page.tsx
```

## 2. モジュール設計

| ファイル・関数 | 役割 | 主な処理 |
|---|---|---|
| `app/layout.tsx` | Root Layout | `html`、`body`、メタデータを定義 |
| `app/page.tsx` | 入口画面 | 正常一覧と取得失敗確認へのLinkを表示 |
| `app/tasks/page.tsx` | Server Component | queryを読み、サーバー側でTaskを取得・表示 |
| `fetchTasks` | 学習用データ取得 | 固定Task配列を返し、指定時だけ失敗を再現 |
| `next.config.ts` | 実行制御 | 使用CPUを1、worker threadを無効にする |

## 3. 画面・入力設計

| URL | 処理 | 表示 |
|---|---|---|
| `/` | 入口 | 正常表示と失敗確認へのLink |
| `/tasks` | `fetchTasks(false)` | Task3件 |
| `/tasks?fail=1` | `fetchTasks(true)` | サーバー側の取得失敗表示 |

Next.jsの現行App Routerに合わせ、`searchParams`をPromiseとして受け取り、Server Component内でawaitする。

## 4. データ設計

```ts
type Task = {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
};
```

| `status` | 画面表示 |
|---|---|
| `todo` | 未着手 |
| `doing` | 作業中 |
| `done` | 完了 |

固定データは3件で、サーバー側関数から順番に返す。DB、外部API、ローカルAPI、永続保存は使用しない。

## 5. サーバー側処理

1. `/tasks`のServer Componentを実行する。
2. `searchParams`をawaitし、`fail=1`か判定する。
3. `fetchTasks`を実行する。
4. 成功時はTask3件をReact要素へ変換する。
5. 失敗時はcatchし、`role="alert"`のエラー表示を返す。
6. Next.jsがHTMLを生成してブラウザへ返す。

ブラウザ側JavaScriptから別APIへGET要求を送る処理はない。機密情報をClient Componentへ渡す実装もない。

## 6. エラー設計

| 状況 | 発生方法 | 表示 |
|---|---|---|
| 正常取得 | `/tasks` | 「サーバー側で取得した一覧」と3件のTask |
| 学習用の取得失敗 | `/tasks?fail=1` | 「データ取得に失敗しました」と理由 |

失敗再現は外部サービスを停止せずに確認するための教材用分岐である。独自のHTTP APIエラーコードや実行時データ形式検証は定義しない。

## 7. 実行設計

| 項目 | 内容 |
|---|---|
| 開発起動 | `next dev` |
| StudyHub表示URL | `http://127.0.0.1:43224/` |
| 必要環境 | Node.js、npm |
| 停止 | StudyHubが起動したNext.jsプロセスだけを終了 |

AI処理、DDL、認証、監査ログ基盤は使用しない。

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 正常一覧を開く | 3件のTaskが表示される |
| `CHK-002` | Networkタブを確認する | ブラウザから別APIへの取得要求がない |
| `CHK-003` | 最初のHTMLを確認する | Taskの内容が含まれる |
| `CHK-004` | ソースを確認する | `fetchTasks`がServer Component内で実行される |
| `CHK-005` | 取得失敗確認を開く | サーバー側のエラー表示になる |

学習手順とクライアントfetchとの比較は[`doc/learning_notes/web24_next_server_fetch/README.md`](../learning_notes/web24_next_server_fetch/README.md)を参照する。
