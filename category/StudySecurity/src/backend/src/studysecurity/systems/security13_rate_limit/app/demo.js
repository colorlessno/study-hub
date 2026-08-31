const assert = require("assert");
const { createLimiter } = require("./rate_limiter");

const check = createLimiter(3, 10_000);
const results = [
  check("user:demo", 0),
  check("user:demo", 1),
  check("user:demo", 2),
  check("user:demo", 3),
  check("user:demo", 10_000),
];

assert.deepStrictEqual(results.map((result) => result.allowed), [true, true, true, false, true]);
console.log(JSON.stringify(results, null, 2));
