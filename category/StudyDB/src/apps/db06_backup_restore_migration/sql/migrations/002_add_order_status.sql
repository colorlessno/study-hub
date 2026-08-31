SET search_path TO db06;

ALTER TABLE orders
ADD COLUMN status TEXT NOT NULL DEFAULT 'created';

ALTER TABLE orders
ADD CONSTRAINT orders_status_check CHECK (status IN ('created', 'paid', 'cancelled'));

