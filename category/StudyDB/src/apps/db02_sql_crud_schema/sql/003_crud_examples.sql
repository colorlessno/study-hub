SET search_path TO db02;

SELECT id, name, email FROM customers ORDER BY id;

INSERT INTO customers (name, email)
VALUES ('Customer D', 'customer-d@example.test')
RETURNING id, name, email;

UPDATE products
SET price = 900.00
WHERE name = 'Notebook'
RETURNING id, name, price;

DELETE FROM customers
WHERE email = 'customer-d@example.test'
RETURNING id, name, email;

SELECT id, name, email FROM customers ORDER BY id;

