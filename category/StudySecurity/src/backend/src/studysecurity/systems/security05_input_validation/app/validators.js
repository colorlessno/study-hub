function validateProduct(input) {
  const errors = [];
  if (!input.name || typeof input.name !== "string") errors.push({ field: "name", message: "required_string" });
  if (typeof input.name === "string" && input.name.length > 40) errors.push({ field: "name", message: "too_long" });
  if (!Number.isInteger(input.price) || input.price < 0 || input.price > 1000000) errors.push({ field: "price", message: "invalid_range" });
  return errors;
}

function validateCsvRow(row, rowNumber) {
  if (row.length !== 3) return [{ rowNumber, field: "*", message: "column_count" }];
  return validateProduct({ name: row[1], price: Number(row[2]) }).map((e) => ({ rowNumber, ...e }));
}

module.exports = { validateProduct, validateCsvRow };
