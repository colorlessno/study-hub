const fs = require("fs");
const path = require("path");

const mode = process.argv[2];
const filePath = process.argv[3];
const modes = new Set(["monthly", "product", "customer"]);

if (!modes.has(mode) || !filePath) {
  console.error("Usage: node scripts/analyze_sales.js <monthly|product|customer> <csv-file>");
  process.exit(2);
}

const rows = fs.readFileSync(path.resolve(filePath), "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((line) => !line.startsWith("order_id,"))
  .map((line) => {
    const [orderId, orderDate, customerSegment, region, productCategory, productName, quantity, unitPrice, discountRate] = line.split(",");
    return {
      orderId,
      orderDate,
      customerSegment,
      region,
      productCategory,
      productName,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      discountRate: Number(discountRate)
    };
  });

function groupKey(row) {
  if (mode === "monthly") return row.orderDate.slice(0, 7);
  if (mode === "product") return `${row.productCategory} / ${row.productName}`;
  return `${row.customerSegment} / ${row.region}`;
}

const groups = new Map();
for (const row of rows) {
  const key = groupKey(row);
  const current = groups.get(key) ?? {
    group: key,
    orderCount: 0,
    unitsSold: 0,
    netSales: 0,
    discountTotal: 0
  };
  current.orderCount += 1;
  current.unitsSold += row.quantity;
  current.netSales += row.quantity * row.unitPrice * (1 - row.discountRate);
  current.discountTotal += row.discountRate;
  groups.set(key, current);
}

const result = [...groups.values()].map((group) => {
  const summary = {
    group: group.group,
    orderCount: group.orderCount,
    unitsSold: group.unitsSold,
    netSales: Math.round(group.netSales * 100) / 100
  };
  if (mode === "product") {
    summary.averageDiscountRate = Math.round((group.discountTotal / group.orderCount) * 10000) / 10000;
  }
  return summary;
});

console.log(JSON.stringify({ mode, source: filePath, result }, null, 2));
