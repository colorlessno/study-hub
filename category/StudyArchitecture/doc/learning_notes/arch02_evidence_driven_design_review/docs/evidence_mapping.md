# arch02の証拠マッピング

| 設計上の主張 | 期待する証拠 | 実際に取得する証拠 | 判定 |
|---|---|---|---|
| タスク登録はHTTP 201 | task作成時の201 | 画面、curl、Playwrightで202 | mismatch |
| タスクはSQLiteへ保存される | 保存後と再起動後の一覧 | `GET /api/tasks`、画面のSQLite一覧 | match |
| 要求をTrace IDで追跡できる | API応答とログの同一ID | タスク応答、`GET /api/logs` | match |
| healthとreadyを確認できる | 各200応答 | `/health`、`/ready` | match |
| レビュー結果を後から確認できる | 状態と残リスクの再読込 | `POST /api/reviews`、再起動後の一覧 | match |

## confidence

| level | 意味 |
|---|---|
| 高 | 実行結果と保存結果を直接確認した |
| 中 | ソース証拠はあるが再起動後の確認がない |
| 低 | 構造からの推測だけである |

新しい証拠なしにconfidenceを上げない。`unknown`を推測でmatchへ変更しない。
