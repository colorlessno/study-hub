SET search_path TO db02;

SELECT
  o.id AS order_id,
  c.name AS customer_name,
  o.status,
  p.name AS product_name,
  oi.quantity,
  oi.unit_price
FROM orders o
INNER JOIN customers c ON c.id = o.customer_id
INNER JOIN order_items oi ON oi.order_id = o.id
INNER JOIN products p ON p.id = oi.product_id
ORDER BY o.id, oi.id;

SELECT
  c.id AS customer_id,
  c.name AS customer_name,
  o.id AS order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
ORDER BY c.id, o.id;

