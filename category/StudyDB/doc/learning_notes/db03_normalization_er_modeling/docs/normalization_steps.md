# 正規化ステップ

| step | 内容 | 結果 |
|---|---|---|
| 1NF | 繰り返し項目を行へ分ける | 注文明細候補ができる |
| 2NF | 注文明細に依存しない顧客・商品を分ける | customers、products候補 |
| 3NF | 推移従属を分ける | orders、order_items、customers、products |

