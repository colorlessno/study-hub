# web33 Cookie / Session 最小サンプル 基本設計
## 0. 関連要件

- `../requirements/web33_cookie_session_requirements.md`

## 1. 設計目的
Cookie と Session によるログイン状態管理を最小構成で確認するサンプルを設計する。
## 2. 対象範囲

- login / logout
- session id cookie
- protected endpoint
- DevTools Application タブ確認
## 3. 成果物構成

```text
src/backend/src/studyweb/systems/web33_cookie_session/
  server/
  Dockerfile
  package.json
doc/learning_notes/web33_cookie_session/
  README.md
  docs/
    cookie_check.md
    session_flow.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| login request | 固定ユーザーでログイン |
| cookie | session id |
| protected request | Cookieあり・なしの比較|

## 5. 出力
| 出力| 内容|
|---|---|
| login result | ログイン成功・失敗|
| cookie | HttpOnly / SameSite 属性|
| protected response | 未ログイン・ログイン済みの差 |

## 6. 処理手順
1. login APIでsessionを作る
2. Cookieをブラウザへ返す
3. protected APIでCookieを確認する
4. logout APIでsessionを無効化する
5. DevToolsでCookie属性を確認する
## 7. 確認観点

- Cookieに機密情報を直接入れていないか
- Session本体がサーバーにあることを説明できる
- ログイン前後の通信差分が確認できる
## 8. 後続工程への引き継ぎ

詳細設計では、session保存方式、Cookie属性、各APIのレスポンスを定義する。
