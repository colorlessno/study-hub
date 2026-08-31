# arch02の指摘記録

## F-001 状態コードの不一致

| 項目 | 内容 |
|---|---|
| severity | Medium |
| finding | 期待仕様はHTTP 201だが、タスク登録APIはHTTP 202を返す |
| evidence | `docs/review_target_design.md`、`GET /api/review-scope`、タスク登録のAPI応答、202の要求ログ |
| impact | 201だけを成功として扱う呼び出し側が、保存済みタスクを失敗と誤判定する可能性がある |
| fix candidate | 設計を202へ改訂するか、実装を201へ変更し、呼び出し側の期待も統一する |
| status | 学習時に未対応、対応済み、リスク受容から選びSQLiteへ保存する |
| residual risk | 状態コードを統一するまでは利用側の成功判定を確認する |

## 指摘の書式

実際の指摘は、severity、finding、evidence、impact、fix candidate、status、residual riskを埋める。具体的な影響や証拠のない好みは指摘にしない。
