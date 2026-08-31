# arch02のレビュー結果テンプレート

## 指摘

| 項目 | 記入内容 |
|---|---|
| evidence type | 画面、API、SQLite、ログ、health、Playwright artifact |
| finding | 期待と実際の差 |
| impact | 利用者または運用への具体的な影響 |
| fix candidate | 差を解消または管理する変更案 |
| status | 未対応、対応済み、リスク受容 |
| residual risk | 対応後も残る確認事項 |

## arch02で確認する既知の差

- 期待仕様: `POST /api/tasks`はHTTP 201。
- 実行証拠: 同APIはHTTP 202を返し、タスク自体はSQLiteへ保存される。
- 判断: 設計または実装を統一するまで、利用側の成功判定を残リスクとして記録する。

## 検証記録

| check | result / evidence |
|---|---|
| review targetと期待仕様 |  |
| 画面とAPI応答 |  |
| SQLite保存と再起動後の読込 |  |
| Trace ID付き実行ログ |  |
| health / ready |  |
| Playwright screenshot / trace |  |
| 文書との整合 |  |

確認できなかった項目は空欄のままにせず、理由と次の確認方法を残リスクへ記録する。
