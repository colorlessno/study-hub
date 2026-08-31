# web48 job status API 基本設計
## 0. 関連要件

- `../requirements/web48_job_status_api_requirements.md`

## 1. 設計目的
時間がかかる処理を job として受け付け、状態確認するAPIを設計する。
## 2. 対象範囲

- job create
- job status
- queued / running / succeeded / failed
- polling
- failure reason

## 3. 成果物構成

```text
src/backend/src/studyweb/systems/web48_job_status_api/
  api/
  Dockerfile
  package.json
doc/learning_notes/web48_job_status_api/
  README.md
  docs/
    job_state.md
    polling_flow.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| job request | 処理開始要求 |
| job id | 状態確認キー |

## 5. 出力
| 出力| 内容|
|---|---|
| accepted response | job id |
| status response | queued/running/succeeded/failed |
| failure reason | 失敗理由 |

## 6. 処理手順
1. job作成APIでjob idを返す
2. メモリ上でjob状態を管理する
3. 状態確認APIで現在状態を返す
4. StudyHub画面からjob idを使い、一回の状態確認が完了してから次を実行する
5. 成功・失敗を表示する

## 7. 確認観点

- HTTPリクエストを長時間待たせていないか
- 状態遷移が説明できる
- 失敗理由を確認できる
## 8. 後続工程への引き継ぎ

詳細設計では、job schema、API、状態遷移、画面表示を定義する。
