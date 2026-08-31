# arch01のrequest / data flow

## 注文登録の流れ

| step | component | action | 証拠 | state change |
|---:|---|---|---|---|
| 1 | ブラウザ画面 | 商品名と数量を読み、JSONを送る | `app/public/main.js` | 画面入力をrequest bodyへ変換 |
| 2 | Node.js HTTPサーバー | `POST /api/orders`を受け、Trace IDを決める | `app/server.js` | request内のTrace ID |
| 3 | 入力検証 | 商品名が空でないこと、数量が正整数であることを確認する | 400応答の分岐 | 永続状態は変えない |
| 4 | SQLite | `orders`へ注文、`request_logs`へ201とTrace IDを保存する | SQL文、注文一覧、ログ一覧 | 2表へ永続保存 |
| 5 | HTTP応答 | 201と保存した注文を返す | 画面のAPI応答 | ブラウザが結果を表示 |

## health / readyの流れ

- `GET /health`はNode.jsプロセスが応答できる限り200を返す。
- `GET /ready`はSQLiteへ問い合わせ、障害モード中でなければ200を返す。
- 障害モード中は`/health`が200、`/ready`と`POST /api/orders`が503になる。

## HTTPで確認する

```cmd
curl.exe http://127.0.0.1:43701/health
curl.exe http://127.0.0.1:43701/ready
curl.exe -X POST http://127.0.0.1:43701/api/orders -H "Content-Type: application/json" -d "{\"item\":\"architecture-book\",\"quantity\":1}"
curl.exe http://127.0.0.1:43701/api/orders
curl.exe http://127.0.0.1:43701/api/logs
```

各コマンドは一つずつ順番に実行し、注文応答のTrace IDとログを対応付ける。

## 保存範囲

注文と要求ログはarch01専用SQLiteへ保存される。障害モードは教材用のプロセスメモリー状態なので、サーバー再起動時は解除状態へ戻る。
