"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { maskPii } = require("../app/masker");

test("メール、電話番号、顧客IDを種類別ラベルへ置換する", () => {
  const input = "連絡先は demo@example.com、電話は03-1234-5678、顧客IDはCUST-12345です。";
  const output = maskPii(input);

  assert.equal(output, "連絡先は [email]、電話は[phone]、顧客IDは[customer-id]です。");
  for (const originalValue of ["demo@example.com", "03-1234-5678", "CUST-12345"]) {
    assert.equal(output.includes(originalValue), false);
  }
});

test("対象を含まない文章を変更しない", () => {
  assert.equal(maskPii("個人情報を含まない説明です。"), "個人情報を含まない説明です。");
});

test("空値を空文字として安全に処理する", () => {
  assert.equal(maskPii(), "");
  assert.equal(maskPii(null), "");
});
