SET search_path TO db02;

INSERT INTO customers (name, email) VALUES
  ('Customer A', 'customer-a@example.test'),
  ('Customer B', 'customer-b@example.test'),
  ('Customer C', 'customer-c@example.test');

INSERT INTO products (name, price) VALUES
  ('Notebook', 800.00),
  ('Pen', 120.00),
  ('Desk Light', 3200.00),
  ('Storage Box', 1500.00);

INSERT INTO orders (customer_id, status) VALUES
  (1, 'created'),
  (1, 'paid'),
  (2, 'created');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 2, 800.00),
  (1, 2, 5, 120.00),
  (2, 3, 1, 3200.00),
  (3, 4, 3, 1500.00);

