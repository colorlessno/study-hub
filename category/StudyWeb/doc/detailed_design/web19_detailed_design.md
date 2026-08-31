# web19 詳細設計
## ReactからAPIを呼んで一覧表示

## 1. 実装対象

React画面からNestJS APIへGET要求を送り、固定のタスク3件を一覧表示する。API応答を600ミリ秒遅らせ、読込中表示を確認できる構成とする。

```text
src/infra/compose/web19_fetch_task_list/
└── docker-compose.yml
src/backend/src/studyweb/systems/web19_fetch_task_list/backend/
├── Dockerfile
├── package.json
└── src/
    ├── app.module.ts
    ├── main.ts
    └── tasks.controller.ts
src/frontend/src/studyweb/systems/web19_fetch_task_list/frontend/
├── Dockerfile
├── package.json
└── src/
    ├── App.tsx
    ├── main.tsx
    └── styles.css
```

## 2. モジュール設計

| モジュール | 役割 | 主な処理 |
|---|---|---|
| `App.tsx` | 一覧画面 | GET要求、読込中・成功・失敗の状態表示 |
| `tasks.controller.ts` | タスクAPI | 600ミリ秒待機後に固定のTask配列を返す |
| `main.ts` | API起動 | NestJSを3000番で待受し、CORSを有効にする |
| `docker-compose.yml` | 実行環境 | backendとfrontendをビルド・起動する |

## 3. API設計

### GET `/tasks`

入力はない。成功時はHTTP 200で次の形式の配列を返す。

| 項目 | 型 | 説明 |
|---|---|---|
| `id` | string | タスク識別子 |
| `title` | string | タスク名 |
| `done` | boolean | 完了状態 |

データはAPI内の固定3件であり、DBへ保存しない。

## 4. フロントエンド状態設計

| state | 初期値 | 更新条件 | 表示 |
|---|---|---|---|
| `tasks` | 空配列 | JSON取得成功 | Task一覧 |
| `loading` | `true` | GET終了時に`false` | 「読み込み中です。」 |
| `error` | 空文字 | HTTPエラーまたは通信失敗 | 「取得に失敗しました」 |

`VITE_API_URL`が設定されていない場合は`http://localhost:13019`を使う。HTTP応答が成功状態でない場合は`HTTP <状態番号>`をエラーとして扱う。

## 5. Docker Compose設計

| service | 公開ポート | 役割 |
|---|---|---|
| `backend` | 13019 → 3000 | NestJS API |
| `frontend` | 5179 → 5173 | Vite開発サーバー |

frontendは`VITE_API_URL=http://localhost:13019`でブラウザからbackendへ接続する。backendのCORS設定により別OriginからのGET要求を許可する。

## 6. エラー設計

| 状況 | 検出箇所 | 画面結果 |
|---|---|---|
| APIがHTTPエラーを返す | `response.ok` | HTTP状態番号を含む取得失敗表示 |
| API停止またはURL不正 | `fetch`の失敗 | ブラウザが返す通信エラーを表示 |
| JSON解析失敗 | `response.json()` | 解析例外を取得失敗として表示 |

独自のAPIエラーコードやTask配列の実行時形式検証は実装しない。

## 7. データ・AI・監査

- DBとDDLは使用しない。
- AI処理は使用しない。
- 監査ログ基盤は対象外とし、ブラウザのNetworkタブとDockerログを確認に使う。

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 画面を開く | 読込中表示の後に3件のTaskが表示される |
| `CHK-002` | Networkタブを確認する | `GET /tasks`とJSON応答を確認できる |
| `CHK-003` | 応答ヘッダーを確認する | 別Originからの通信を許可するCORSヘッダーがある |
| `CHK-004` | backendを停止して再読込する | 取得失敗が表示される |
| `CHK-005` | backendを再起動して再読込する | 一覧表示へ戻る |

学習手順と完了条件は[`doc/learning_notes/web19_fetch_task_list/README.md`](../learning_notes/web19_fetch_task_list/README.md)を参照する。
