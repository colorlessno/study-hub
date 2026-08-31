# web34 CORS成功・失敗サンプル 詳細設計
## 0. 関連文書

- `../requirements/web34_cors_success_failure_requirements.md`
- `../basic_design/web34_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studyweb/systems/web34_cors_success_failure/
  Dockerfile
  package.json
  backend/src/server.js
  frontend/src/server.js
doc/learning_notes/web34_cors_success_failure/
  README.md
  docs/cors_failure.md
  docs/cors_success.md
```

## 2. 主要設計
| 区分 | 内容 |
|---|---|
| Frontend | `http://127.0.0.1:3034` |
| CORS拒否API | `http://localhost:3035`、許可ヘッダーなし |
| CORS許可API | `http://localhost:3036`、`ALLOW_CORS=1` |
| API | `OPTIONS /api/message`, `POST /api/message` |
| Cookie | 許可APIが`web34_session=study`を発行し、credentialsありの次回要求で受信 |

## 3. CORS応答ヘッダー

CORS許可APIだけが次を返す。

| Header | Value |
|---|---|
| `Access-Control-Allow-Origin` | `http://127.0.0.1:3034` |
| `Access-Control-Allow-Headers` | `Content-Type` |
| `Access-Control-Allow-Methods` | `GET,POST,OPTIONS` |
| `Access-Control-Allow-Credentials` | `true` |

拒否APIはOPTIONSへ204を返しても上記ヘッダーを付けない。APIプロセスは応答しているが、ブラウザは本要求または応答本文の利用を許可しない。

## 4. 画面操作

| 操作 | 送信先 | credentials | 期待結果 |
|---|---|---|---|
| 許可しないAPIへ送信 | 3035 | omit | ブラウザが応答利用を拒否 |
| 許可するAPIへ送信（Cookieなし） | 3036 | omit | HTTP 200、Cookieを送らない |
| 許可するAPIへ送信（Cookieあり） | 3036 | include | HTTP 200、Cookieを保存・送信できる |

credentialsありの操作は初回にCookieを保存し、もう一度実行すると応答本文の`cookieReceived`が`true`になる。

## 5. 確認手順

1. CORS拒否モードでブラウザ通信する
2. Console/Networkのエラーを記録する
3. 許可APIへcredentialsなしで送信し、HTTP 200とCORS応答ヘッダーを確認する
4. 許可APIへcredentialsありで二回送信し、Cookieの保存と送信を確認する
5. NetworkでOPTIONSとPOSTを確認する
6. curlではブラウザと制約が異なることを確認する

## 6. 完了条件

- CORS失敗と成功を再現できる
- preflightを確認できる
- credentialsの有無とCookie送信の差を確認できる
- ブラウザ制約とサーバー設定の関係を説明できる
