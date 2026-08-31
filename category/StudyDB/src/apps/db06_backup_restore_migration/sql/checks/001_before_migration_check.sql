SET search_path TO db06;

SELECT 'customers' AS table_name, count(*) AS row_count FROM customers
UNION ALL
SELECT 'orders' AS table_name, count(*) AS row_count FROM orders;

SELECT * FROM customers ORDER BY id;
SELECT * FROM orders ORDER BY id;

