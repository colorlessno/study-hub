# web32 HTTPヘッダー観察基本設計
## 0. 関連要件

- `../requirements/web32_http_headers_requirements.md`

## 1. 設計目的
HTTP request / response / header / body を、ブラウザと curl の両方で観察できる学習サンプルを設計する。
## 2. 対象範囲

- GET / POST API
- request header / response header
- request body / response body
- DevTools Network 確認
- curl 確認
## 3. 成果物構成

```text
src/backend/src/studyweb/systems/web32_http_headers/
  server/
  Dockerfile
  package.json
doc/learning_notes/web32_http_headers/
  README.md
  docs/
    devtools_check.md
    curl_check.md
    observation_log.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| GET request | `/api/hello` |
| POST request | `/api/echo` |
| request header | `Content-Type`, custom header |
| request body | JSON payload |

## 5. 出力
| 出力| 内容|
|---|---|
| response header | content type, request id |
| response body | JSON response |
| 観察ログ | DevTools と curl の比較|

## 6. 処理手順
1. 最小APIを起動する
2. ブラウザ画面からAPIを呼ぶ
3. DevTools Networkで通信を見る
4. curlで同じAPIを呼ぶ
5. header、body、statusを記録する

## 7. 確認観点

- DevTools と curl の見え方を比較できる
- GET と POST の違いを説明できる
- status、header、body を分けて記録できる
## 8. 後続工程への引き継ぎ

詳細設計では、API endpoint、画面構成、curlコマンド、観察ログの項目を定義する。
