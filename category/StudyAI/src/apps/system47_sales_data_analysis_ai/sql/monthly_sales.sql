SELECT
  date_trunc('month', order_date)::date AS sales_month,
  COUNT(*) AS order_count,
  SUM(quantity) AS units_sold,
  ROUND(SUM(quantity * unit_price * (1 - discount_rate)), 2) AS net_sales
FROM system47.sales_orders
GROUP BY sales_month
ORDER BY sales_month;
