# curlによるPOST確認

`Content-Type: application/json`を指定し、JSON形式の本文を送信します。

```cmd
curl.exe -i -X POST http://127.0.0.1:3010/items -H "Content-Type: application/json" -d "{\"name\":\"new item\"}"
```
