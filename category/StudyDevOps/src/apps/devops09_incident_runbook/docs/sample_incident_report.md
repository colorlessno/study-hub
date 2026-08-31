# 障害報告記入例: runtime error教材

実顧客・実環境を使わない固定教材です。

## 受付情報

- Incident ID: `INC-TRAINING-001`
- 受付時刻: `T+00:00`
- 検知経路: devops08の手動HTTP確認
- 調査担当: learner
- 判断者: learner
- 状態: 解決済み（教材）

## 概要と影響

- 概要: `app-runtime-error`がrequestへ500を返した。
- 確認できた影響: ローカル教材のport 18089に対する操作だけが失敗した。
- 影響なしと確認できた範囲: `app-ok`は200を返した。
- 未確認: 外部環境は対象外。
- Severity: S3。ローカルの意図的な障害で、実利用者への影響がないため。

## タイムライン

| 時刻 | 事実・操作 | 証拠・判断理由 |
|---|---|---|
| T+00:00 | port 18089が500を返すことを確認 | HTTP statusと`runtime_error` |
| T+00:02 | Compose statusを確認 | containerはrunning |
| T+00:03 | request IDでログを確認 | `action=request_failed` |
| T+00:05 | `APP_MODE=runtime-error`を確認 | Compose定義。値の全一覧は取得しない |
| T+00:08 | 教材の意図した障害と判定 | server実装と自動テストが一致 |

## 技術的事実

| 確認項目 | 結果 | 証拠の場所 |
|---|---|---|
| container status | running | `docker compose ps -a` |
| HTTP | 500 / `runtime_error` | 手動request |
| request ID | response headerと失敗ログで一致 | `docker compose logs app-runtime-error` |
| startup failure | なし | `server_started`ログあり |

## 仮説と原因

| 仮説 | 根拠 | 反証結果 | 判定 |
|---|---|---|---|
| 起動に失敗した | 500が返る | containerはrunning、startup logあり | 棄却 |
| runtime error modeである | error codeとCompose設定が一致 | 自動テストでも再現 | 採用 |

確定原因は、教材用Composeが`APP_MODE=runtime-error`を明示していることです。不具合や未知の本番障害ではありません。

## 判断記録

| 時刻 | 判断 | 根拠 | リスク・戻し方 |
|---|---|---|---|
| T+00:04 | restartしない | processは正常にrequestを受け、同じ設定なら再発する | 操作なし |
| T+00:08 | 教材の期待動作として収束 | 実装、設定、testが一致 | Composeを`down`して終了 |

## 対応と再発防止

- 一時対応: 不要。教材の意図した失敗と確認した。
- 回復確認: `app-ok`の200を確認した。
- 恒久対応: 不要。
- 再発防止: 起動失敗とruntime errorを自動テストで区別し続ける。
- Runbook更新: request ID、事実と仮説の分離、restart前の証拠保全を明記した。

秘密情報、認証トークン、パスワード、接続文字列、個人情報、実顧客情報は使用していません。
