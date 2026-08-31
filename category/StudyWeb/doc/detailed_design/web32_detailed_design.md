# web32 HTTPヘッダー観察 詳細設計
## 0. 関連文書

- `../requirements/web32_http_headers_requirements.md`
- `../basic_design/web32_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studyweb/systems/web32_http_headers/
  Dockerfile
  package.json
  server/src/server.js
doc/learning_notes/web32_http_headers/
  README.md
  docs/devtools_check.md
  docs/curl_check.md
  docs/observation_log.md
```

## 2. 主要設計
| 区分 | 内容 |
|---|---|
| API | `GET /api/hello`, `POST /api/echo` |
| Header | `Content-Type`, `X-Study-Request-Id` |
| Client | 同じNode.jsサーバーが配信する学習用HTMLから`fetch`でGET/POSTを実行 |
| 確認 | DevTools Network、StudyHubの要求操作、curlの結果を比較 |

## 3. API I/O

| Method | Path | 入力 | Status | 応答 |
|---|---|---|---:|---|
| GET | `/` | なし | 200 | 操作画面のHTML |
| GET | `/client/src/main.js` | なし | 200 | GET・POST操作用JavaScript |
| GET | `/api/hello` | 任意の要求ヘッダー | 200 | methodと受信header |
| POST | `/api/echo` | 任意の本文 | 200 | method、受信header、本文 |
| 任意 | 上記以外 | なし | 404 | `{ "error": "not_found" }` |

API応答には要求ごとに生成した`X-Study-Request-Id`を付与する。画面のGET操作は`X-Client: browser`、StudyHubのGET操作は`X-Client: studyhub`を送信し、通信元ごとの差を観察できるようにする。

## 4. 画面項目

| 項目 | 処理 |
|---|---|
| POSTメッセージ | `/api/echo`へ送る文字列を入力 |
| `GET /api/hello` | GET要求を送信して要求・応答を表示 |
| `POST /api/echo` | JSON本文を送信して要求・応答を表示 |
| 結果領域 | method、URL、要求ヘッダー・本文、status、応答ヘッダー・本文をJSON表示 |

## 5. 確認手順

1. `npm start`またはStudyHubの起動操作でサーバーを起動する。
2. 教材画面を開き、GETとPOSTを一つずつ実行する。
3. DevTools NetworkでHeaders、Payload、Responseを確認する。
4. StudyHubのGET、POST、存在しないURLの要求操作を一つずつ実行する。
5. `curl.exe -i`でも同じAPIを呼び、付与されるheaderの違いを観察記録へ記載する。

## 6. エラー処理

- 未定義URLは404と`not_found`を返す。
- POST本文は通信観察用の文字列として扱い、業務入力の検証は行わない。
- 3032番またはStudyHub用43332番を使用できない場合は起動エラーとして確認する。

## 7. 完了条件

- GET/POSTのheader/body/statusを確認できる
- DevToolsとcurlの結果を記録できる
- ブラウザとStudyHubで異なる要求ヘッダーを比較できる
- 存在しないURLの404応答を確認できる
- 観察ログへ実際の結果を記録できる
