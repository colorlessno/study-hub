# security01 Session認証 要件定義

## 1. 目的

Cookie + Session によるログイン、ログアウト、認証済みAPIの基本を学ぶ。

## 2. 学習対象

- Session認証
- Cookie属性
- login / logout
- password hash の入口
- 認証状態確認

## 3. 作成する成果物

- Session認証サンプル
- 認証フロー図
- Cookie確認手順
- 認証失敗時のレスポンス例

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | login APIでSessionを作成できる |
| FR-02 | CookieにSession IDを設定できる |
| FR-03 | 認証済みAPIでSessionを検証できる |
| FR-04 | logout APIでSessionを無効化できる |
| FR-05 | 未ログイン時に401を返せる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | Cookieにユーザー情報や権限を直接入れない |
| NFR-02 | HttpOnly / SameSite を説明できる |
| NFR-03 | 学習用実装と本番実装の差を明記する |

## 6. 対象外

- OAuth / SSO
- 多要素認証
- 本格的なSession store

## 7. 受入条件

- login前後のCookieとAPI応答を確認できる
- Session IDとSession本体の違いを説明できる
- 401の意味を説明できる

## 8. 学習観点

- 認証状態はサーバ側でも確認する
- Cookieは便利だが属性設定が重要
- 本番ではpassword hashとSession storeが必要
