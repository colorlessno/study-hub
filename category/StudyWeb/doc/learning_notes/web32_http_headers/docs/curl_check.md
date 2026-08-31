# curlでの確認手順

コマンドプロンプトで実行する。

```bat
curl.exe -i http://localhost:3032/api/hello
curl.exe -i -X POST http://localhost:3032/api/echo -H "Content-Type: application/json" -d "{\"message\":\"hello\"}"
curl.exe -i http://localhost:3032/api/not-found
```

`-i`を付けると、応答本文だけでなくHTTP状態番号と応答ヘッダーも表示される。
