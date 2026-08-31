SET search_path TO db04;

BEGIN;
  INSERT INTO orders (product_id, quantity, status) VALUES (1, 2, 'created');
  UPDATE products SET stock = stock - 2, updated_at = now() WHERE id = 1;
  INSERT INTO transaction_events (event_name, note) VALUES ('commit_example', 'order and stock update');
COMMIT;

SELECT 'after commit' AS phase, id, name, stock FROM products ORDER BY id;

BEGIN;
  INSERT INTO orders (product_id, quantity, status) VALUES (2, 5, 'created');
  UPDATE products SET stock = stock - 5, updated_at = now() WHERE id = 2;
  INSERT INTO transaction_events (event_name, note) VALUES ('rollback_example', 'this transaction is rolled back intentionally');
ROLLBACK;

SELECT 'after rollback' AS phase, id, name, stock FROM products ORDER BY id;
