# 検索条件の仕様

| 項目 | 例 | 動作 | 入力規則 |
|---|---|---|---|
| `keyword` | `keyword=Item%201` | 名前の部分一致 | 省略可能 |
| `status` | `status=open` | 状態の完全一致 | `open`または`closed` |
| `sort` | `sort=createdAt` | 指定した項目で並べ替える | `name`、`status`、`createdAt` |
| `order` | `order=desc` | 昇順または降順 | `asc`または`desc` |
| `limit` | `limit=5` | 取得する最大件数 | 1～50の整数。既定値10 |
| `offset` | `offset=5` | 先頭から読み飛ばす件数 | 0以上の整数。既定値0 |

## 組合せ例

```text
/items?keyword=1&status=open&sort=createdAt&order=desc&limit=5&offset=0
```

filter、sortを適用した後で、offsetからlimit件を切り出す。

## 不正値の確認

```text
/items?order=sideways
/items?limit=abc
/items?offset=abc
/items?sort=unknown
/items?status=unknown
```

これらの値が入力規則に合わない場合は400を返します。GET以外の操作には405と`Allow: GET`を返します。
