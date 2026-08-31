# web34 CORSの成功と失敗

異なるオリジン（通信元）の画面からAPIを呼び、ブラウザが応答の利用を拒否する状態と、APIがオリジンを許可した状態を比較する。

## このテーマでできるようになること

- CORSを許可しないAPIと許可するAPIへ、同じPOST要求を送信できる
- Network（通信）で、事前確認のOPTIONSと実際のPOSTを確認できる
- 許可しないAPIでは応答を利用できず、許可するAPIではHTTP 200の本文を表示できることを確認できる
- 拒否時もAPI自体は動作しており、ブラウザが応答の利用を制限していることを確認できる
- credentialsなし・ありの要求を比較し、許可したオリジンへCookieを保存・送信できることを確認できる

## 最初に取り組むこと

1. StudyHubで「起動」を押し、教材画面を表示する。
2. ブラウザ開発者ツールのConsoleとNetwork（通信）を開く。
3. 「許可しないAPIへ送信」を押し、画面・Console・OPTIONSの結果を確認する。
4. 「許可するAPIへ送信（Cookieなし）」を押し、HTTP 200の本文と`Access-Control-Allow-*`を確認する。
5. 「許可するAPIへ送信（Cookieあり）」を二回押し、初回にCookieが発行され、二回目に`cookieReceived: true`になることを確認する。
6. 拒否APIと許可APIへ送ったPOST要求を比較し、応答ヘッダーとcredentials指定によってブラウザの扱いが変わることを確認する。

## 単体で起動する場合

三つのコマンドプロンプトを開き、同じ作業フォルダーで次を一つずつ実行する。

```bat
cd /d C:\work\work20260617\category\StudyWeb\src\backend\src\studyweb\systems\web34_cors_success_failure
rtk npm.cmd run backend:deny
```

```bat
cd /d C:\work\work20260617\category\StudyWeb\src\backend\src\studyweb\systems\web34_cors_success_failure
rtk npm.cmd run backend:allow
```

```bat
cd /d C:\work\work20260617\category\StudyWeb\src\backend\src\studyweb\systems\web34_cors_success_failure
rtk npm.cmd run frontend
```

`http://127.0.0.1:3034/`を開く。終了するときは各コマンドプロンプトで`Ctrl+C`を押す。

## 観察ポイント

- CORSはAPIが動いているかどうかではなく、ブラウザが応答を利用してよいかを判断する仕組みである
- 拒否時でもAPIプロセスは起動している。Console、Network（通信）、サーバーログを分けて見る
- `curl`はブラウザの同一オリジンポリシーを適用しないため、CORS許可ヘッダーがなくても応答を表示できる
- `Access-Control-Allow-Origin` は、このサンプルでは `http://127.0.0.1:3034` だけを許可する
- Cookieを伴う要求では、画面側の`credentials: include`とAPI側の`Access-Control-Allow-Credentials: true`の両方が必要になる
- web35も3035番を使うため、次のテーマへ進む前にweb34を停止する

## 自分の言葉で説明する

- 3034 と 3035 が別 origin になるのはなぜか
- preflight は誰が、何を確認するために送るのか
- API が 200 を返せてもブラウザで失敗することがあるのはなぜか
- credentialsを有効にする場合、画面とAPIの両方へ何を設定する必要があるか
- 全 origin を無条件に許可する設定にはどんな危険があるか

## うまく動かないとき

- 教材画面が開かない場合は、3034・3035・3036番が別のプロセスに使われていないか確認する。
- 許可するAPIも失敗する場合は、教材画面を`http://127.0.0.1:3034/`で開いているか確認する。
- Network（通信）にPOSTがない場合は、その直前のOPTIONSが失敗していないか確認する。
