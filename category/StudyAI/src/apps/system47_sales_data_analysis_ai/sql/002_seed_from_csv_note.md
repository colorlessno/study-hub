# CSVからのseedメモ

`data/sales_sample.csv` を `system47.sales_orders` に読み込む。

PostgreSQLでの例:

```sql
\copy system47.sales_orders(order_id, order_date, customer_segment, region, product_category, product_name, quantity, unit_price, discount_rate)
FROM 'data/sales_sample.csv'
WITH (FORMAT csv, HEADER true);
```

CSV読み込みは、AI説明promptとは分ける。AIにはDB接続情報や書き込み権限を渡さず、集計済みの表だけを渡す。
