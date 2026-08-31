SET search_path TO db05;

EXPLAIN ANALYZE
SELECT id, customer_id, status
FROM orders
WHERE customer_id::text = '42';

EXPLAIN ANALYZE
SELECT id, customer_id, status
FROM orders
WHERE lower(status) = 'paid';

