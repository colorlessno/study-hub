"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { validateCsvRow, validateProduct } = require("../app/validators");

test("valid product has no errors", () => {
  assert.deepEqual(validateProduct({ name: "Keyboard", price: 9000 }), []);
});

test("name length and price boundaries are inclusive", () => {
  assert.deepEqual(validateProduct({ name: "a".repeat(40), price: 0 }), []);
  assert.deepEqual(validateProduct({ name: "Upper", price: 1_000_000 }), []);
});

test("invalid product reports every field error", () => {
  assert.deepEqual(validateProduct({ name: "", price: -1 }), [
    { field: "name", message: "required_string" },
    { field: "price", message: "invalid_range" },
  ]);
});

test("numeric strings are not accepted as product prices", () => {
  assert.deepEqual(validateProduct({ name: "Keyboard", price: "9000" }), [
    { field: "price", message: "invalid_range" },
  ]);
});

test("CSV validation includes row number and column errors", () => {
  assert.deepEqual(validateCsvRow(["p-1", "Keyboard", "9000"], 7), []);
  assert.deepEqual(validateCsvRow(["bad"], 8), [
    { rowNumber: 8, field: "*", message: "column_count" },
  ]);
  assert.deepEqual(validateCsvRow(["p-2", "Keyboard", "not-a-number"], 9), [
    { rowNumber: 9, field: "price", message: "invalid_range" },
  ]);
});
