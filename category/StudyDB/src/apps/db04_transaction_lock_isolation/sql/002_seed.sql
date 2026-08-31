SET search_path TO db04;

INSERT INTO products (name, stock) VALUES
  ('Notebook', 10),
  ('Pen', 100);

SELECT id, name, stock
FROM products
ORDER BY id;
