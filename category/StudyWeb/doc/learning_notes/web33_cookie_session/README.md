# web33 Cookieとセッション

ブラウザの Cookie には session ID だけを保存し、ログイン中のユーザー情報はサーバー側メモリで管理する最小サンプル。画面だけでなく、通信と保存領域からログイン状態を追跡する。

## このテーマでできるようになること

- 未ログインの確認・ログイン・ログイン状態の確認・ログアウト・再確認を順番に実行できる
- 未ログイン時とログアウト後は401、ログイン中は200になることを確認できる
- CookieのHttpOnly・SameSite=Lax・Path=/をブラウザ開発者ツールで確認できる
- サーバーを停止して再起動すると、メモリ上のセッションが失われることを確認できる
- セッションの有効期限・永続化・古いセッションの削除は、この最小教材の対象外であることを確認できる

## 起動方法

StudyHubでは「起動」を押した後、要求操作を上から順に実行する。単体で起動する場合は、コマンドプロンプトで次を実行する。

```bat
cd /d C:\work\work20260617\category\StudyWeb\src\backend\src\studyweb\systems\web33_cookie_session
rtk npm.cmd test
rtk npm.cmd start
```

`http://localhost:3033/` を開き、DevTools の Network タブと Application タブを表示する。終了は `Ctrl+C`。

依存パッケージはなく、`npm install`は不要。自動テストはテスト専用の空きポートで、ログイン、ログイン状態の確認、ログアウト、再確認とCookie属性を確認する。構文確認は`rtk npm.cmd run build`で行える。

## 最初に取り組むこと

1. Cookie がない状態で `me` を押し、401 を確認する
2. `login` を押し、200 と response header の `Set-Cookie` を確認する
3. Application タブの Cookies で `sid` と各属性を確認する
4. `me` を押し、200 とユーザー情報を確認する
5. `logout` を押し、Cookie が削除されることを確認する
6. もう一度 `me` を押し、401 に戻ることを確認する

確認項目は [Cookie確認](docs/cookie_check.md)、全体の流れは [Session Flow](docs/session_flow.md) に短くまとめている。

## 観察ポイント

- Cookie の値は `sid_...` だけで、ユーザー名は Cookie に保存されない
- `HttpOnly` の Cookie は JavaScript から読み取れないが、ブラウザは通信時に送信できる
- `SameSite=Lax` は cross-site 通信で Cookie を送る条件に関係する
- Session はプロセス内の Map にしかないため、サーバーを停止すると消える
- HTTPS を使わないローカル学習用なので `Secure` 属性は付けていない。本番設計を示す実装ではない

## 自分の言葉で説明する

- Cookie と Session はそれぞれどこに保存されるか
- `sid` だけではユーザー情報が分からないのに、なぜログイン状態を復元できるか
- 401 になるケースを少なくとも3つ挙げられるか
- logout でサーバー側とブラウザ側の両方を処理する理由は何か

## うまく動かないとき

- 操作順によって結果が分からなくなった場合は、ログアウトしてから未ログイン状態の確認へ戻る。
- Cookieが見つからない場合は、教材画面を開いた状態でApplication（保存領域）を確認する。
- サーバー再起動後の確認では、Cookieが残っていてもメモリ上のセッションが消えている点を分けて見る。
