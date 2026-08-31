# arch02の証拠チェックリスト

## ソースと設計

| 確認 | 証拠 |
|---|---|
| 起動入口とループバック待受 | `app/server.js`、`package.json` |
| 期待仕様201 | `docs/review_target_design.md`、`GET /api/review-scope` |
| 教材fixtureの実装202 | `POST /api/tasks`の応答と要求ログ |
| SQLiteの表 | `tasks`、`reviews`、`request_logs`のDDL |
| レビュー状態 | 未対応、対応済み、リスク受容 |

## 実行証拠

| 確認 | 証拠 |
|---|---|
| 画面からタスクを登録した | API応答表示、タスク一覧 |
| 期待201と実際202の差を確認した | review scope、API status |
| タスクとレビュー結果がSQLiteに残った | 画面一覧、API一覧、再起動後の読込 |
| Trace ID付き202ログを確認した | `GET /api/logs` |
| healthとreadyが200を返した | 画面または`curl.exe`の応答 |
| Playwrightを1 workerで実行した | screenshot、trace、test result |

## 判定ルール

実行していない項目を通過扱いにしない。取得できなかった証拠は理由と次の確認方法を残リスクへ記録する。
