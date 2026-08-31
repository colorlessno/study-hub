# web33 Cookie / Session 最小サンプル 詳細設計
## 0. 関連文書

- `../requirements/web33_cookie_session_requirements.md`
- `../basic_design/web33_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studyweb/systems/web33_cookie_session/
  Dockerfile
  package.json
  server/src/server.js
  test/server.test.js
doc/learning_notes/web33_cookie_session/
  README.md
  docs/cookie_check.md
  docs/session_flow.md
```

## 2. 主要設計
| 区分 | 内容 |
|---|---|
| API | `POST /login`, `POST /logout`, `GET /me` |
| Cookie | `sid`, `HttpOnly`, `SameSite=Lax` |
| Session | Node.jsプロセス内の`Map`で管理する学習用メモリセッション |
| Client | 同じNode.jsサーバーが配信する学習用HTMLでlogin、me、logoutを順に確認 |

## 3. API I/O

| Method | Path | Cookie | Status | 応答・処理 |
|---|---|---|---:|---|
| GET | `/` | 不要 | 200 | 操作画面のHTML |
| POST | `/login` | 不要 | 200 | セッションを作成し、`sid` Cookieを発行 |
| GET | `/me` | 有効な`sid` | 200 | サーバー側セッションのユーザー情報 |
| GET | `/me` | なし・無効 | 401 | `not_logged_in` |
| POST | `/logout` | 任意 | 200 | セッションを削除し、`Max-Age=0`でCookieを削除 |
| 任意 | 上記以外 | 任意 | 404 | `not_found` |

Cookieへ保存するのは推測困難なsession IDだけであり、ユーザー名や機密情報は保存しない。ローカルHTTP教材のため`Secure`は付与せず、本番向け認証としては扱わない。

## 4. セッション処理

1. loginで`sid_<UUID>`を生成し、`Map`へユーザー情報を保存する。
2. `Set-Cookie: sid=...; HttpOnly; SameSite=Lax; Path=/`を返す。
3. meではCookieを解析し、該当するセッションを検索する。
4. logoutではサーバー側セッションを削除し、ブラウザ側Cookieも期限切れにする。
5. プロセス停止時は`Map`が失われるため、再起動後は古いCookieを送っても401になる。

## 5. テスト

- Cookie値に`=`が含まれても解析できることを確認する。
- 未ログイン401、login 200、認証後me 200、logout 200、logout後me 401を順番に確認する。
- `HttpOnly`、`SameSite=Lax`、`Path=/`、`Max-Age=0`を応答ヘッダーで確認する。
- 未定義URLが404になることを確認する。

## 6. 確認手順

1. 未ログインで`/me`を確認し、401になることを確認する。
2. loginして応答の`Set-Cookie`とApplicationタブのCookieを確認する。
3. `/me`が200になり、サーバー側のユーザー情報が返ることを確認する。
4. logout後にCookieとセッションが無効になることを確認する。
5. login後にサーバーを再起動し、古いCookieでは401になることを確認する。

## 7. 完了条件

- CookieとSessionの役割を確認できる
- login前後とlogout後のstatus・Cookie・応答の差を説明できる
- Cookieに機密情報を直接入れていないことを確認できる
- メモリセッションの再起動時消失と、本番向けに不足する有効期限・永続化・古いセッション削除を説明できる
