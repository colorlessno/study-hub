# curlによるGET確認

サンプルAPIを単独で起動した状態で、別のコマンドプロンプトから実行します。`-i`を付けると応答ヘッダーと状態コードも表示されます。

```cmd
curl.exe -i http://127.0.0.1:3010/health
curl.exe -i http://127.0.0.1:3010/items
curl.exe -i -H "Authorization: Bearer studybase" http://127.0.0.1:3010/private
```
