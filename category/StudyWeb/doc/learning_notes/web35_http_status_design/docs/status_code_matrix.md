# HTTP状態番号の対応表

| HTTP状態番号 | この教材での意味 | API |
|---|---|---|
| 200 | 一覧取得に成功 | `GET /items` |
| 201 | 新規作成を受け付けた | `POST /items` |
| 400 | 入力内容が不正 | `GET /bad-request` |
| 401 | 認証されていない | `GET /private` |
| 403 | 認証済みだが権限がない | `GET /admin` |
| 404 | 指定した対象がない | `GET /items/999` |
| 409 | 現在の状態と操作が競合 | `GET /duplicate` |
| 500 | サーバー内部の失敗を表す | `GET /error` |
