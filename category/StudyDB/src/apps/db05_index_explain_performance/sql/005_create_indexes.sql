SET search_path TO db05;

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at);
CREATE INDEX idx_orders_status_ordered_at ON orders(status, ordered_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

ANALYZE orders;
ANALYZE order_items;

SELECT count(*) AS created_index_count
FROM pg_indexes
WHERE schemaname = 'db05'
  AND indexname LIKE 'idx_%';
