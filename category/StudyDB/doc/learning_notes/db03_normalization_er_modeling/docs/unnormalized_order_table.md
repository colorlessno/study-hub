# 非正規な注文表

| order_id | customer_name | customer_email | product_names | product_prices | quantities | order_total |
|---|---|---|---|---|---|---|
| 1001 | Customer A | customer-a@example.test | Notebook, Pen | 800, 120 | 2, 5 | 2200 |

## 問題

- 商品がカンマ区切りで、明細単位に扱えない。
- 顧客情報が注文ごとに重複する。
- 商品価格変更時に過去注文との扱いが曖昧になる。
- 合計金額は明細から計算できる派生値。

