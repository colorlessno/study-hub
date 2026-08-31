# security11 Webhook署名検証 要件定義

## 1. 目的

Webhook requestのraw bodyをHMACで検証し、改ざんとreplayを別々に防ぐ判断を学ぶ。

## 2. 学習対象

- HMAC-SHA256
- raw bodyとtimestamp
- timing-safe comparison
- event IDの重複検出

## 3. 作成する成果物

- 署名生成・検証module
- `POST /webhook`のlocal server
- 正常、改ざん、期限切れ、再送のCLI demo
- replay対策の補足資料

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | `timestamp.rawBody`をHMAC-SHA256で署名・検証できる |
| FR-02 | timestampが5分の許容範囲外なら401を返す |
| FR-03 | 署名不一致なら401を返す |
| FR-04 | event IDが欠けていれば400、処理済みなら409を返す |
| FR-05 | 64KiBを超えるbodyを413で拒否する |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 外部Webhook serviceへ接続しない |
| NFR-02 | secretは環境変数または明確な学習用ダミー値だけを使う |
| NFR-03 | 署名は通常の文字列比較ではなく`timingSafeEqual`で比較する |

## 6. 対象外

- provider固有の署名形式
- 永続storeを用いたevent ID管理
- distributed systemでの排他制御

## 7. 受入条件

- CLI demoで200、401、400、409を再現できる
- serverがbodyをparseする前のbytesを署名対象にできる
- 正しい署名だけではreplayを防げないと説明できる

## 8. 学習観点

- JSONをparse・再serializeすると署名対象bytesが変わり得る
- timestampは有効期間、event IDは同じrequestの再実行を制御する
- event IDの永続化期間はproviderの再送方針と合わせる
