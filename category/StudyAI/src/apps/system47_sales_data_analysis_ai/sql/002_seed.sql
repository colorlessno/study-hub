SET search_path TO system47;

INSERT INTO sales_orders (
  order_id,
  order_date,
  customer_segment,
  region,
  product_category,
  product_name,
  quantity,
  unit_price,
  discount_rate
) VALUES
  ('S-1001', '2026-01-05', 'small_business', 'east', 'software', 'starter_license', 3, 12000, 0.00),
  ('S-1002', '2026-01-12', 'enterprise', 'west', 'software', 'enterprise_license', 1, 180000, 0.05),
  ('S-1003', '2026-01-19', 'individual', 'east', 'service', 'onboarding_support', 2, 24000, 0.00),
  ('S-1004', '2026-02-03', 'small_business', 'central', 'software', 'starter_license', 5, 12000, 0.10),
  ('S-1005', '2026-02-08', 'enterprise', 'east', 'service', 'onboarding_support', 4, 24000, 0.00),
  ('S-1006', '2026-02-22', 'individual', 'west', 'hardware', 'edge_device', 1, 42000, 0.00),
  ('S-1007', '2026-03-04', 'small_business', 'west', 'hardware', 'edge_device', 2, 42000, 0.05),
  ('S-1008', '2026-03-11', 'enterprise', 'central', 'software', 'enterprise_license', 2, 180000, 0.08),
  ('S-1009', '2026-03-18', 'individual', 'east', 'software', 'starter_license', 1, 12000, 0.00),
  ('S-1010', '2026-03-26', 'small_business', 'east', 'service', 'onboarding_support', 3, 24000, 0.00);
