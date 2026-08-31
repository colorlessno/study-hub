CREATE SCHEMA IF NOT EXISTS system47;

DROP TABLE IF EXISTS system47.sales_orders;

CREATE TABLE system47.sales_orders (
  order_id text PRIMARY KEY,
  order_date date NOT NULL,
  customer_segment text NOT NULL,
  region text NOT NULL,
  product_category text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  discount_rate numeric(5, 4) NOT NULL DEFAULT 0 CHECK (discount_rate >= 0 AND discount_rate < 1)
);
