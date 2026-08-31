# ER model

| entity | attributes | relation |
|---|---|---|
| customers | id, name, email | 1 customer has many orders |
| products | id, name, price | 1 product appears in many order_items |
| orders | id, customer_id, ordered_at, status | 1 order has many order_items |
| order_items | id, order_id, product_id, quantity, unit_price | joins orders and products |

