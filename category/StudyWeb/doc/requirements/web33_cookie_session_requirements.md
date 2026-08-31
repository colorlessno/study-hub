# web33 Cookie / Session 最小サンプル 要件定義

## 1. 目的

Cookie と Session によるログイン状態管理の基本を理解する。

## 2. 学習対象

- Cookie
- Session ID
- login / logout
- HttpOnly
- SameSite
- DevTools Application タブ

## 3. 作成する成果物

- Cookie + Session の最小ログインサンプル
- Cookie確認手順
- Session状態確認メモ
- login / logout の動作ログ

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | ログイン時にCookieを発行できる |
| FR-02 | Cookieによりログイン状態を判定できる |
| FR-03 | ログアウト時にCookieまたはSessionを無効化できる |
| FR-04 | DevToolsでCookie属性を確認できる |
| FR-05 | 未ログイン時とログイン時のレスポンスを比較できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 学習用の最小実装にする |
| NFR-02 | password hash 等の本格認証は `StudySecurity` 側で扱う |
| NFR-03 | Cookieに機密情報を直接入れない |

## 6. 対象外

- 本番相当の認証実装
- password hash
- RBAC
- CSRF対策の深掘り

## 7. 受入条件

- Cookie と Session の役割を説明できる
- ログイン前後でCookieとレスポンスが変わることを確認できる
- Cookieに保存してよいもの、悪いものを区別できる

## 8. 学習観点

- Cookieはブラウザが保存する
- Session本体はサーバ側で管理する
- ログイン状態は画面ではなく通信と保存領域で確認する
