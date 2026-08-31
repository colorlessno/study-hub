# API確認ログ

| 確認内容 | HTTPメソッドとURL | 送信ヘッダー・本文 | 状態コード | 応答本文 | 判断 |
|---|---|---|---:|---|---|
| 起動確認 | `GET /health` | なし | 200 | `{"ok":true}` | 正常 |
| 名前なしで登録 | `POST /items` | `Content-Type: application/json` / `{}` | 400 | `name_required` | 入力不足 |
|  |  |  |  |  |  |
