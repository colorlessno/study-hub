const assert = require("assert");
const { sign } = require("./signature");
const { ACCEPTANCE_WINDOW_MS, validateWebhook } = require("./webhook");
const { MAX_BODY_BYTES, bodySizeResult } = require("./server");

const now = 2_000_000_000_000;
const timestamp = String(now);
const body = Buffer.from('{"event":"order.created"}', "utf8");
const signature = sign(timestamp, body);
const seen = new Set();

const cases = [
  ["valid", validateWebhook({ timestamp, body, signature, eventId: "evt-1" }, { now, seen }), 200],
  ["replay", validateWebhook({ timestamp, body, signature, eventId: "evt-1" }, { now, seen }), 409],
  ["tampered", validateWebhook({ timestamp, body: Buffer.from("tampered"), signature, eventId: "evt-2" }, { now, seen }), 401],
  ["expired", validateWebhook({ timestamp: String(now - ACCEPTANCE_WINDOW_MS - 1), body, signature, eventId: "evt-3" }, { now, seen }), 401],
  ["missing event id", validateWebhook({ timestamp, body, signature }, { now, seen }), 400],
  ["body too large", bodySizeResult(MAX_BODY_BYTES + 1), 413],
];

for (const [name, result, expectedStatus] of cases) {
  assert.strictEqual(result.status, expectedStatus);
  console.log(JSON.stringify({ name, ...result }));
}
