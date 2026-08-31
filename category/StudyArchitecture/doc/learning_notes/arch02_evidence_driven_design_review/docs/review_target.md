# arch02のレビュー対象

## 対象

| 項目 | 値 |
|---|---|
| system | `arch02_evidence_driven_design_review`内の独立したタスク登録システム |
| reviewする動作 | 画面から`POST /api/tasks`を実行し、SQLiteとログへ保存する流れ |
| 期待仕様 | タスク登録はHTTP 201を返す |
| 実装上の教材fixture | タスク登録はHTTP 202を返す |
| review観点 | 設計記述と実行証拠の一致、保存、診断可能性、残リスク |
| 証拠範囲 | arch02の画面、API、SQLite、ログ、health / ready、Playwright artifact |

## 対象外

- 他のStudyテーマの実装や保存先
- 本番用途のタスク管理機能
- 画面の見た目だけの好み
- 性能・セキュリティ監査の代替

## review質問

期待するHTTP 201と実際のHTTP 202が一致しないとき、呼び出し側の成功判定へどのような影響があり、どの証拠を根拠に修正またはリスク受容を判断するか。
