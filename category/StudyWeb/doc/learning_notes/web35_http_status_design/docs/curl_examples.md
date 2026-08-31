# curlでの確認例

コマンドプロンプトで実行する。

```bat
curl.exe -i http://localhost:3035/items
curl.exe -i -X POST http://localhost:3035/items
curl.exe -i http://localhost:3035/bad-request
curl.exe -i http://localhost:3035/private
curl.exe -i http://localhost:3035/admin
curl.exe -i http://localhost:3035/items/999
curl.exe -i http://localhost:3035/duplicate
curl.exe -i http://localhost:3035/error
```
