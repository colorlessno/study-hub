# URLと画面の対応表

| URLの#以降 | 表示する画面 |
|---|---|
| `#/items` | 一覧 |
| `#/items/new` | 新規作成 |
| `#/items/:id` | 詳細 |
| `#/items/:id/edit` | 編集 |
| `#/items/:id/delete` | 削除確認 |
| その他・存在しないID | 対象なし |

`:id`には対象の番号が入る。React RouterがURLに一致する画面を選び、作成・更新・削除後は一覧へ移動する。項目はReactのstateに保持するため、ページの再読み込み時は初期状態へ戻る。
