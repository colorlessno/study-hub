# 識別キーの処理手順

```text
POST /orders + new key
  -> key未登録
  -> 注文を作成
  -> keyとresultを保存
  -> 201 replay=false

POST /orders + same key
  -> key登録済み
  -> 保存済みresultを取得
  -> 新しい注文は作らない
  -> 200 replay=true
```

## 保存を検討する情報

| 情報 | 目的 |
|---|---|
| key | 同じ操作を識別する |
| request hash | 同じkey・異なるpayloadを検出する |
| status | processing / succeeded / failedを区別する |
| response | 再送時に同じ結果を返す |
| createdAt / expiresAt | 保持期間と掃除を管理する |

現在はメモリMapにkeyと成功resultだけを保存する。再起動、同時request、期限切れ、処理途中の再送までは扱わない。
