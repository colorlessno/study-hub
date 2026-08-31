SET search_path TO db02;

-- 各SQLは制約違反を意図的に起こす。1件ずつ実行してエラーを確認する。

INSERT INTO customers (name, email)
VALUES ('Duplicate Email', 'customer-a@example.test');

INSERT INTO customers (name, email)
VALUES (NULL, 'missing-name@example.test');

INSERT INTO orders (customer_id, status)
VALUES (999, 'created');

INSERT INTO products (name, price)
VALUES ('Invalid Price', -1);

INSERT INTO order_items (order_id, product_id, quantity, unit_price)
VALUES (1, 1, 0, 800.00);
