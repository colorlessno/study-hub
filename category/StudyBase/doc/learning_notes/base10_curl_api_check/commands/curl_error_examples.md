# curlによるエラー確認

同じAPIへ送信内容を変え、状態コードと応答本文の違いを確認します。

```cmd
curl.exe -i -X POST http://127.0.0.1:3010/items -H "Content-Type: application/json" -d "{}"
curl.exe -i http://127.0.0.1:3010/private
curl.exe -i http://127.0.0.1:3010/forbidden
curl.exe -i http://127.0.0.1:3010/missing
curl.exe -i -X POST http://127.0.0.1:3010/health
curl.exe -i -X POST http://127.0.0.1:3010/items -H "Content-Type: text/plain" -d "new item"
curl.exe -i http://127.0.0.1:3010/error
curl.exe -i http://127.0.0.1:3010/upstream-error
```

本文サイズ超過の413はStudyHubの「大きすぎる本文」で確認できます。
