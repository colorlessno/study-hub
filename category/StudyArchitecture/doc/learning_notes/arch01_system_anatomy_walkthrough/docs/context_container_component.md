# arch01のcontext / container / component

## Context

| actor | 目的 | arch01との境界 | 証拠 |
|---|---|---|---|
| 学習者 | 注文を登録し、保存結果と実行ログを確認する | ブラウザからHTTP通信する | `app/public/index.html`、実画面 |
| ブラウザ | 入力をJSONへ変換し、API応答を画面へ表示する | `127.0.0.1:43701`だけへ接続する | `app/public/main.js` |
| arch01 | 注文登録、SQLite保存、ログ、障害モードを提供する | 他テーマや外部サービスへ接続しない | `app/server.js` |

## Container

| container | 責務 | 証拠 |
|---|---|---|
| 静的画面 | 注文入力、一覧、ログ、health / ready、障害切替を表示する | `app/public/` |
| Node.js HTTPサーバー | 静的配信、APIルーティング、検証、応答、Trace ID採番を行う | `app/server.js` |
| arch01専用SQLite | `orders`と`request_logs`を停止・再起動後も保持する | `initializeDatabase`、`ARCH01_DB_PATH` |

## Component

| component | 責務 | 証拠 |
|---|---|---|
| static handler | HTML、CSS、JavaScriptを返す | `serveStatic` |
| order API | 注文を検証し、SQLiteへ保存する | `POST /api/orders` |
| order query | 保存済み注文を新しい順に返す | `GET /api/orders` |
| request logger | Trace ID、method、path、statusを保存する | `logRequest`、`GET /api/logs` |
| failure mode | 注文受付とreadinessを教材用に停止・復旧する | `POST /api/failure-mode` |
| health / ready | プロセス生存と注文受付可能状態を分けて返す | `GET /health`、`GET /ready` |

## システム境界

arch01にバックグラウンドジョブ、外部API、別テーマのサービスは存在しない。観察した証拠にない構成要素を推測で追加しない。
