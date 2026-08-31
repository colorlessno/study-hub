# web21 通信エラーの調査

React画面から200、400、404、500のAPIを呼び、DevTools NetworkでURL、status、response body、接続エラーを比較するテーマです。

## このテーマでできるようになること

- 200・400・404・500の各ボタンを押し、Network（通信）タブの違いを比較できる
- APIを停止し、HTTP応答を受け取れない通信エラーを確認できる
- Request URL（送信先）・Status（状態番号）・Response（応答本文）を確認できる
- fetchは400や500でも応答を受け取り、通信自体の失敗とは別に扱うことを確認できる

## 最初に取り組むこと

次の順番で確認する。

1. Composeを起動してDevToolsのNetworkを開き、200、400、404、500のbuttonを順に押す。
2. 各通信のstatus、Headers、Response bodyを比較し、調査に使える情報を記録する。
3. `fetch`後のstatus判定を確認し、HTTP 400はresponseとして処理され、通信不能とは異なることを確認する。
4. backendを停止してnetwork errorを発生させ、HTTP 500との違いを確認する。

## 起動方法

`category/StudyWeb/src/infra/compose/web21_network_debug`で実行します。

```bash
docker compose up --build
```

| 対象 | URL |
|---|---|
| Frontend | `http://localhost:5181` |
| API例 | `http://localhost:13021/debug/success` |

## 比較表

| 操作 | Network status | Promiseの流れ | 画面 |
|---|---:|---|---|
| 200 | 200 | responseをJSON化 | statusとbody |
| 400 | 400 | responseをJSON化 | statusとbody |
| 404 | 404 | responseをJSON化 | statusとbody |
| 500 | 500 | responseをJSON化 | statusとbody |
| API停止 | statusなし | catch | `通信エラー: ...` |

## 自分の言葉で説明する

- HTTPエラーとnetwork errorをNetwork表示でどう見分けますか。
- 400や500でcatchへ入らない理由は何ですか。
- 調査時にRequest URLを最初に確認する利点は何ですか。

## うまく動かないとき

- ボタンが通信を出さない場合は、Consoleとclick処理を確認します。
- すべて通信エラーなら、backend状態と13021番を確認します。
- statusはあるが画面更新に失敗する場合は、ResponseがJSONか確認します。
