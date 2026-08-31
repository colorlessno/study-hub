SET search_path TO db05;

INSERT INTO orders (customer_id, status, ordered_at, total_amount) VALUES
  (1, 'created', now() - interval '5 days', 1200),
  (1, 'paid', now() - interval '4 days', 3200),
  (2, 'paid', now() - interval '3 days', 800),
  (3, 'cancelled', now() - interval '2 days', 500);

INSERT INTO order_items (order_id, product_id, quantity) VALUES
  (1, 10, 2),
  (1, 11, 1),
  (2, 12, 1),
  (3, 10, 1),
  (4, 13, 1);

