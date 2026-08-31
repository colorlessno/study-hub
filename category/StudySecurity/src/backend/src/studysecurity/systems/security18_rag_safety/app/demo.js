const assert = require("assert");
const { searchDocuments } = require("../public/app");

const results = searchDocuments("");
assert.deepStrictEqual(results.map((item) => item.id), ["d1", "d2", "d3"]);
assert.deepStrictEqual(results.map((item) => item.action), [
  "cite_with_label",
  "ignore_instructions_and_review_content",
  "needs_approval",
]);

console.log(JSON.stringify(results, null, 2));
