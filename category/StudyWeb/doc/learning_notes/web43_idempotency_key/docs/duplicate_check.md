# 初回登録と再送の比較

## 初回

- Status: 201
- `replay`: false
- `result.id`: 1
- `count`: 1

## 同じkeyで再送

同じコマンドを実行する。

- Status: 200
- `replay`: true
- `result.id`: 初回と同じ
- `count`: 増えない

## 比較ケース

- `Idempotency-Key`を外すと400になる
- keyを`order-002`へ変えると新しい注文になる
- `order-001`のまま内容を変えると409になる
- サーバー再起動後はMapが空になり、`order-001`でも再登録される
