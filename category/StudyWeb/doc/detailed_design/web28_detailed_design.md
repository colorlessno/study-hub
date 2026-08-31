# web28 詳細設計
## .envによる設定の切り替え
---

## 1. 実装ディレクトリ構成

```text
category/StudyWeb/
├── src/infra/compose/web28_env_config/docker-compose.yml
├── src/infra/env/web28_env_config/.env.example
├── src/backend/src/studyweb/systems/web28_env_config/backend/
│   ├── server.js
│   ├── test/server.test.js
│   └── Dockerfile
├── src/frontend/src/studyweb/systems/web28_env_config/frontend/
│   ├── src/main.tsx
│   └── Dockerfile
└── doc/learning_notes/web28_env_config/README.md
```

## 2. モジュール詳細

| モジュール | 役割 | 主な設定 |
|---|---|---|
| `.env.example` | 設定見本 | ダミー値 |
| Compose | env読込 | 必須変数の展開、ports、serviceのenvironment |
| Frontend | API URL参照 | `VITE_API_URL`をbundleに埋め込み、`/config-check`を呼び出す |
| Backend | 環境変数検証とAPI | `PORT`、`DATABASE_URL`、`APP_MESSAGE`を検証する |
| Backend test | 設定検証 | 必須値、port範囲、秘密値の非公開を検査する |

## 3. API 詳細

設定確認用に`GET /health`と`GET /config-check`を用意する。

| メソッド | パス | 応答 |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/config-check` | status、API待受port、DB設定の有無、環境別message |
| GET | その他 | HTTP 404と`{ "error": "not_found" }` |
## 4. 詳細API I/O 定義

| 環境変数 | 利用先 | 説明 |
|---|---|---|
| `FRONTEND_PORT` | Compose | Web公開ポート。必須 |
| `API_PORT` | Compose | API公開ポート。必須 |
| `API_INTERNAL_PORT` | BackendとCompose | Backend待受ポート。既定値3000 |
| `VITE_API_URL` | Frontend | BrowserからのAPI接続先。必須・公開値 |
| `DATABASE_URL` | Backend | DB接続文字列。必須・Browserへ非公開 |
| `APP_MESSAGE` | Backend | 環境別メッセージ。既定値あり |

## 5. 入力チェック仕様
| 対象 | ルール |
|---|---|
| Compose必須値 | `FRONTEND_PORT`、`API_PORT`、`VITE_API_URL`、`DATABASE_URL`は`${VAR:?message}`で未設定を拒否する |
| Backend必須値 | `PORT`、`DATABASE_URL`、`APP_MESSAGE`をまとめて検証する |
| port | 1〜65535の整数だけを受け付ける |
| 公開範囲 | `DATABASE_URL`の値はAPI応答に含めず、設定済みかどうかだけ返す |

## 6. エラー応答仕様
| 応答・エラー | 発生条件 | 対処 |
|---|---|---|
| Composeの`... is required` | Composeの必須変数が空 | `.env.example`の指定と値を確認する |
| `Missing required env: ...` | Backendの必須変数が空 | 起動を終了コード1とし、不足名をログへ出す |
| `Invalid PORT...` | `PORT`が有効範囲外 | Backendを起動せず、port修正を求める |
| `API接続エラー: ...` | Frontendが`/config-check`を取得できない | 画面にerror stateを表示する |

## 7. バリデーション一覧

| 対象 | 確認|
|---|---|
| `.env.example` | 実秘密情報がない |
| `.env` | Git管理対象外 |
| frontend env | 公開可能値のみ |
| Backend test | `npm test`を`--test-concurrency=1`で順次実行する |
| 設定変更 | `APP_MESSAGE`を変更して再起動後の画面表示を確認する |

## 8. データベース詳細

`DATABASE_URL`はBackend専用の設定例として受け取る。現サンプルはDBへ実接続せず、設定の有無と非公開を確認する。
## 9. AI 処理詳細

AI処理は使用しない。
## 10. エラー・監査設計
- 起動時に設定不足がわかるログを出す
- 秘密情報をログに出さない
## 11. DDL

DBスキーマは対象外であり、DDLは定義しない。
## 12. 実装メモ

- README に `.env.example` から `.env` を作る手順を書く
- Viteの`VITE_`接頭辞を持つ値はBrowser bundleへ公開されるため、秘密情報に使用しない
- 学習手順と設定変更は[`README.md`](../learning_notes/web28_env_config/README.md)を参照する
