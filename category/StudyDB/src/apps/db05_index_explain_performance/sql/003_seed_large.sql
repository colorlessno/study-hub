SET search_path TO db05;

INSERT INTO orders (customer_id, status, ordered_at, total_amount)
SELECT
  (g % 500) + 1 AS customer_id,
  CASE WHEN g % 10 = 0 THEN 'cancelled' WHEN g % 3 = 0 THEN 'created' ELSE 'paid' END AS status,
  now() - ((g % 365) || ' days')::interval AS ordered_at,
  ((g % 200) + 1) * 100.00 AS total_amount
FROM generate_series(1, 20000) AS g;

INSERT INTO order_items (order_id, product_id, quantity)
SELECT
  id AS order_id,
  (id % 100) + 1 AS product_id,
  (id % 5) + 1 AS quantity
FROM orders;

ANALYZE db05.orders;
ANALYZE db05.order_items;

SELECT count(*) AS order_count
FROM db05.orders;
