# security02 JWT認証 詳細設計
## 0. 関連文書

- `../requirements/security02_jwt_auth_requirements.md`
- `../basic_design/security02_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security02_jwt_auth/
  README.md
  Dockerfile
  package.json
  app/server.js
  docs/jwt_claims.md
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| `POST /token` | 固定ユーザーの資格情報を検証し、有効期限10分のJWTを発行する |
| `POST /token/expired` | 期限切れ検証用のJWTを発行する |
| `GET /profile` | `Authorization: Bearer`のJWTを検証する |
| 署名 | Node標準`crypto`でHMAC署名を行う |
| claim | `sub`, `role`, `iat`, `exp`を扱う |

## 3. 安全制約
- 署名鍵は学習用ダミー値にし、実秘密情報を置かない。
- `JWT_SECRET`環境変数を指定できるが、未指定時はローカル教材用の固定値を使う。
- JWTの改ざん例はローカル文字列操作に限定する。
- header、期限切れ、署名不一致、形式不正を区別して確認するが、攻撃手順として外部送信しない。
- `/token`は固定した学習用ユーザーだけを検証し、実ユーザーや実パスワードは扱わない。
## 4. 確認手順
1. 誤った資格情報では`/token`が401になり、JWTを発行しないことを確認する。
2. 正しい資格情報でJWTを発行し、payloadをローカルでdecodeする。
3. 正しいJWTで`/profile`が200になることを確認する。
4. payloadを書き換えたJWTが401になることを確認する。
5. `/token/expired`のJWTが401になることを確認する。
## 5. 完了条件

- セッション認証とJWT認証の違いを説明できる。
- JWTの署名検証とclaim検証を分けて説明できる。
- ダミー鍵と実秘密情報を混同しない。
