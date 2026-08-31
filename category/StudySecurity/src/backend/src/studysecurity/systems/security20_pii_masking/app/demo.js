const assert = require("assert");
const { maskPii } = require("./masker");

const sample = "連絡先は demo@example.com、電話は03-1234-5678、顧客IDはCUST-12345です。";
const masked = maskPii(sample);
assert.strictEqual(masked, "連絡先は [email]、電話は[phone]、顧客IDは[customer-id]です。");
assert.strictEqual(maskPii("個人情報を含まない説明です。"), "個人情報を含まない説明です。");

const mode = process.argv[2] || "masked";

if (mode === "masked") {
  console.log(masked);
} else if (mode === "unchanged") {
  console.log(maskPii("個人情報を含まない説明です。"));
} else if (mode === "cases") {
  console.log(JSON.stringify([
    { type: "email", output: maskPii("demo@example.com") },
    { type: "phone", output: maskPii("03-1234-5678") },
    { type: "customer-id", output: maskPii("CUST-12345") }
  ], null, 2));
} else {
  throw new Error(`unknown mode: ${mode}`);
}
