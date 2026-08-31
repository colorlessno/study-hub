# 検索結果の形式

## 正常な検索

```json
{
  "items": [
    {
      "id": 1,
      "name": "Item 1",
      "status": "closed",
      "createdAt": "2026-04-01"
    }
  ],
  "meta": {
    "total": 30,
    "limit": 10,
    "offset": 0,
    "returned": 10,
    "page": 1,
    "totalPages": 3,
    "hasPrevious": false,
    "hasNext": true
  }
}
```

| 項目 | 意味 |
|---|---|
| `items` | 現在のoffsetから返した最大limit件 |
| `meta.total` | filter後・pagination前の総件数 |
| `meta.limit` | 1回の最大取得件数 |
| `meta.offset` | 先頭から読み飛ばした件数 |
| `meta.returned` | 今回返した件数 |
| `meta.page` | 現在ページ。offsetをlimitで割った位置から算出 |
| `meta.totalPages` | 総ページ数 |
| `meta.hasPrevious` | 前のページに相当するデータがあるか |
| `meta.hasNext` | 次のページに相当するデータがあるか |

`items.length`と`total`は同じとは限らない。画面側は`hasPrevious`と`hasNext`を使って前後のページへ移動できるか判断できる。

## 不正な検索条件

```json
{
  "error": "invalid_sort"
}
```

エラー値は、`invalid_limit_out_of_range`、`invalid_offset_out_of_range`、`invalid_status`、`invalid_sort`、`invalid_order`など、原因ごとに分かれています。
