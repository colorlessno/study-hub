SELECT
  customer_segment,
  region,
  COUNT(*) AS order_count,
  SUM(quantity) AS units_sold,
  ROUND(SUM(quantity * unit_price * (1 - discount_rate)), 2) AS net_sales
FROM system47.sales_orders
GROUP BY customer_segment, region
ORDER BY net_sales DESC, customer_segment, region;
