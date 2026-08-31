const { validateProduct, validateCsvRow } = require("./validators");

const samples = [
  { name: "Sample Product", price: 1200 },
  { name: "", price: -1 },
];

console.log("product validation");
for (const sample of samples) console.log(JSON.stringify({ input: sample, errors: validateProduct(sample) }));

console.log("csv validation");
console.log(JSON.stringify(validateCsvRow(["p-1", "Keyboard", "9000"], 1)));
console.log(JSON.stringify(validateCsvRow(["bad"], 2)));
