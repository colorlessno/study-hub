# 実行記録の項目

| 項目 | 値 |
| --- | --- |
| `run_id` | 実行を識別するID |
| `task_id` | 入力または出力ファイルから判別した作業ID |
| `fixture` | 検証した入力または出力ファイル |
| `started_at` | 開始時刻 |
| `ended_at` | 終了時刻 |
| `checks` | 検証名、結果、メッセージ |
| `result` | `passed`または`failed` |
| `failure_reason` | 失敗した理由。成功時は空文字列 |
| `rerun_condition` | 再実行前に直す内容。成功時は`none` |
| `feedback_memo` | 次回の入力、検証、承認境界へ反映する内容 |
| `residual_risk` | 検証後も人間が確認する必要がある内容 |
| `log_path` | JSON記録の保存先 |

## 書き方

- 実行したcheckを省略しない。
- 失敗した場合は、失敗理由と再実行条件を空欄にしない。
- 未確認事項は成功扱いにしない。
- 各検証処理はこの項目をJSONで出力し、`samples/run_logs/`へ保存する。
