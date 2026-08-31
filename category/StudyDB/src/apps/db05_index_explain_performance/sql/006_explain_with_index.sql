SET search_path TO db05;

EXPLAIN ANALYZE
SELECT id, customer_id, status, ordered_at
FROM orders
WHERE customer_id = 42
ORDER BY ordered_at DESC;

EXPLAIN ANALYZE
SELECT id, customer_id, status, ordered_at
FROM orders
WHERE status = 'paid'
  AND ordered_at >= now() - interval '30 days'
ORDER BY ordered_at DESC;

EXPLAIN ANALYZE
SELECT o.id, o.status, count(oi.id) AS item_count
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.customer_id = 42
GROUP BY o.id, o.status
ORDER BY o.id;

