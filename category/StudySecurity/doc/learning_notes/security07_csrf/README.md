# security07 CSRF対策

Cookie認証を使う状態変更で、一回限りのCSRF tokenを検証する教材です。StudyHubからCookieなし、tokenなし、正常なtoken、使用済みtokenを送信し、401、403、200の違いを確認します。

## このテーマでできるようになること

- Cookieがない要求とCSRF tokenが不正な要求の違いを確認できる
- CookieとCSRF tokenを組み合わせた正常な状態変更を確認できる
- 一度使用したtokenを再利用できないことを確認できる
- SameSite CookieとCSRF tokenの役割の違いを説明できる

## 最初に取り組むこと

1. StudyHubでテーマを起動する。
2. 教材画面を開き、「状態とCookieを初期化」「Cookieとtokenを発行」「攻撃ページ風にtokenなしで送信」を順に押して403を確認する。
3. 教材画面で「発行tokenで保護された送信」を押して200を確認し、「同じtokenを再送」で403を確認する。
4. StudyHubのAPI操作でも「確認状態を初期化」を実行して、Cookieと残高を初期状態にする。
5. 「Cookieなしの送信を拒否」を実行し、401を確認する。
6. 「CookieとCSRF tokenを発行」を実行し、応答にあるtokenをコピーする。
7. 「CSRF tokenなしの送信を拒否」を実行し、403を確認する。
8. 「発行されたtokenで送信」にコピーしたtokenを入力し、200と残高の変化を確認する。
9. 「同じtokenの再利用を拒否」に同じtokenを入力し、403を確認する。
10. 「CSRF対策の実装」と「CookieとCSRF tokenの流れ」を開き、各応答の判定条件を確認する。

## 画面で確認する内容

- Cookieがない状態変更は`401 login_required`になる
- Cookieがあってもtokenがなければ`403 invalid_csrf`になる
- 発行されたtokenを一度だけ使用すると、200と更新後の残高が返る
- 使用済みtokenを再送すると`403 invalid_csrf`になる
- token発行時のCookieには`HttpOnly`、`SameSite=Lax`、`Path=/`が付く
- 攻撃ページ風の画面でもCookieは自動送信されるが、tokenなしの状態変更は403になる

## 実装との対応

`GET /demo`が攻撃ページ風の安全な比較画面を返します。`GET /token`がCookieと5分期限のtokenを発行し、`POST /transfer`がCookieとtokenを検証します。tokenは使用時に保存領域から削除されます。`POST /demo/reset`は同じ手順を繰り返すための初期化処理です。

## 学習用実装の範囲

- `sid=demo`は固定値で、本物のSession storeではない
- tokenと残高はプロセスのメモリだけに保存する
- 外部origin、HTTPS、proxy、複数instanceは扱わない
- 状態変更はダミー残高だけで、実送金は行わない
