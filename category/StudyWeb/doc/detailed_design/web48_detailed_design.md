# web48 job status API 詳細設計

## 0. 関連文書

- `../requirements/web48_job_status_api_requirements.md`
- `../basic_design/web48_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studyweb/systems/web48_job_status_api/
  Dockerfile
  package.json
  api/src/server.js
doc/learning_notes/web48_job_status_api/
  README.md
  docs/job_state.md
  docs/polling_flow.md
```

## 2. Endpoint

| Method | Path | Status | 内容 |
|---|---|---:|---|
| POST | `/jobs` | 202 | 成功するjobの受付とID返却 |
| POST | `/jobs?outcome=failed` | 202 | 失敗するjobの受付とID返却 |
| GET | `/jobs/:id` | 200 | 現在状態・結果 |
| GET | unknown ID | 404 | `not_found` |
| その他 | 任意 | 404 | `not_found` |

## 3. Job Data

| State | Data |
|---|---|
| queued | id, status |
| running | id, status |
| succeeded | id, status, result |
| failed | id, status, error |

jobsはプロセス内Mapへ保存する。

## 4. 処理手順

1. POST時に`job_${Date.now()}`でIDを作る。
2. queuedとしてMapへ保存する。
3. 300ms後にrunningへ置き換えるtimerを一つ設定する。
4. runningへ移った後、600ms後に受付時のoutcomeに従ってsucceeded・resultまたはfailed・errorへ置き換えるtimerを設定する。
5. clientへ202とqueuedを直ちに返す。
6. GET時はURLからIDを取り、Mapの現在値または404を返す。

## 5. 要件との差分・既知の課題

- 実background処理・worker・queueはなくtimerだけである。
- ID衝突対策、進捗率、cancel、retry、期限切れがない。
- jobを永続化せず、再起動時に消える。
- 自動polling clientは付属しない。StudyHubの実行欄が進捗確認画面となり、利用者がjob IDを入力して一回ずつ状態を確認する。

## 6. Polling方針

自動化するclientはintervalと最大回数を持ち、succeeded / failed等の終端状態で停止する。現在のStudyHub画面は一回の確認要求が完了してから利用者が次を実行するため、高頻度・無制限pollingは行わない。

## 7. 確認手順

1. POSTで202とjob IDを取得する。
2. GETでqueued・running・succeededを確認する。
3. succeededのresultを確認する。
4. 失敗するjobでfailedとerrorを確認する。
5. unknown IDの404を確認する。

## 8. 完了条件

- 受付と完了結果を別requestとして説明できる。
- 状態遷移を確認できる。
- pollingの停止条件を説明できる。
- failedの失敗理由と、現実装に永続化がないことを説明できる。
