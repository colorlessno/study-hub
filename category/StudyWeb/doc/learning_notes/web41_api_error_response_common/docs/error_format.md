# エラー応答の共通形式

```json
{"error":{"code":"VALIDATION_ERROR","message":"...","details":[],"requestId":"req_xxx"}}
```

| 項目 | 用途 |
|---|---|
| `code` | 画面側でエラーの種類を判定する |
| `message` | 利用者へ状況を説明する |
| `details` | 入力項目などの補足情報を返す |
| `requestId` | サーバーログの対象要求を特定する |

内部エラーでも、スタックトレースやサーバー内のファイルパスは返しません。
