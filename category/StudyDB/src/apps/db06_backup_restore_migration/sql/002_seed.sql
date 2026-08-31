SET search_path TO db06;

INSERT INTO customers (name) VALUES
  ('Customer A'),
  ('Customer B'),
  ('Customer C');

INSERT INTO orders (customer_id, ordered_at) VALUES
  (1, now() - interval '3 days'),
  (1, now() - interval '2 days'),
  (2, now() - interval '1 day');

