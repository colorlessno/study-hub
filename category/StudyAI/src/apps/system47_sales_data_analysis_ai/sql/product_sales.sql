SELECT
  product_category,
  product_name,
  COUNT(*) AS order_count,
  SUM(quantity) AS units_sold,
  ROUND(SUM(quantity * unit_price * (1 - discount_rate)), 2) AS net_sales,
  ROUND(AVG(discount_rate), 4) AS avg_discount_rate
FROM system47.sales_orders
GROUP BY product_category, product_name
ORDER BY net_sales DESC, product_name;
