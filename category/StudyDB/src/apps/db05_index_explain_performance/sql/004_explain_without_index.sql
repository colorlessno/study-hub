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

