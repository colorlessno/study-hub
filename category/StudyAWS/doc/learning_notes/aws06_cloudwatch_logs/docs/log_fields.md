# ログ項目

- `at`: 発生時刻。
- `level`: infoまたはerror。
- `requestId`: 追跡ID。
- `message`: 概要。
- `event`: `request.started`、`request.completed`、`request.failed`の機械判定用名称。
- `path`: リクエストパス。
- `statusCode`: 完了または失敗時のHTTP状態コード。

`message`は人が読む概要、`event`は検索と集計に使う固定値です。1つの要求では開始と終了のrequest IDが一致します。

| CloudWatch Logsの概念 | この教材での対応 |
|---|---|
| log group | aws06アプリのログ出力 |
| log stream | 1回のサーバー起動 |
| log event | 標準出力のJSON 1行 |
