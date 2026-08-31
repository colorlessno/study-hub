# security01 セッション認証 詳細設計
## 0. 関連文書

- `../requirements/security01_session_auth_requirements.md`
- `../basic_design/security01_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security01_session_auth/
  README.md
  Dockerfile
  package.json
  app/server.js
  docs/auth_flow.md
  docs/cookie_check.md
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| `POST /login` | 固定ユーザーを検証し、メモリ上のセッションIDを発行する |
| `GET /me` | Cookieの`sid`を検証し、ログイン状態を返す |
| `POST /logout` | セッションを削除し、Cookieを失効させる |
| Cookie | `HttpOnly`, `SameSite=Lax`, 開発用`Path=/`を付与する |

## 3. 安全制約
- 実ユーザー、実パスワード、実秘密情報は扱わない。
- セッション保存はローカル学習用のメモリに限定する。
- 認証失敗理由は詳細に出し分けず、学習用ログにのみ残す。
## 4. 確認手順
1. 未ログインで`/me`が401になることを確認する。
2. `/login`後にCookieが発行されることを確認する。
3. Cookie付き`/me`が200になることを確認する。
4. `/logout`後に再度401になることを確認する。
## 5. 完了条件

- セッションIDとユーザー情報の違いを説明できる。
- Cookie属性の目的を説明できる。
- 認証前後のHTTP応答を確認できる。
