# Cookie確認観点

- `HttpOnly`: JavaScriptから読み取らせない。
- `SameSite=Lax`: 通常遷移を許しつつCSRFリスクを下げる。
- `Path=/`: サンプル全体でCookieを使う。

本番では`Secure`、有効期限、セッションストア、ローテーションも設計対象になります。
