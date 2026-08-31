SET search_path TO db06;

SELECT id, name, email FROM customers ORDER BY id;
SELECT id, customer_id, ordered_at, status FROM orders ORDER BY id;

SELECT
  count(*) FILTER (WHERE email IS NULL) AS customers_without_email,
  count(*) AS customer_count
FROM customers;

