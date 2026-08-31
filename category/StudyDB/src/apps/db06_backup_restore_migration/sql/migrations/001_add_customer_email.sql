SET search_path TO db06;

ALTER TABLE customers
ADD COLUMN email TEXT;

UPDATE customers
SET email = lower(replace(name, ' ', '-')) || '@example.test';

ALTER TABLE customers
ALTER COLUMN email SET NOT NULL;

ALTER TABLE customers
ADD CONSTRAINT customers_email_unique UNIQUE (email);

