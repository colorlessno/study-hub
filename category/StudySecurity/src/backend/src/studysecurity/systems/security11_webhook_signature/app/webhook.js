const { verify } = require("./signature");

const ACCEPTANCE_WINDOW_MS = 5 * 60 * 1000;

function validateWebhook({ timestamp, body, signature, eventId }, { now = Date.now(), seen = new Set() } = {}) {
  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp) || !Number.isInteger(numericTimestamp)) {
    return { status: 401, error: "timestamp" };
  }
  if (Math.abs(now - numericTimestamp) > ACCEPTANCE_WINDOW_MS) {
    return { status: 401, error: "timestamp" };
  }
  if (typeof eventId !== "string" || eventId.trim() === "") {
    return { status: 400, error: "event_id" };
  }
  if (!verify(timestamp, body, signature)) {
    return { status: 401, error: "signature" };
  }
  if (seen.has(eventId)) {
    return { status: 409, error: "replay" };
  }

  seen.add(eventId);
  return { status: 200, ok: true };
}

module.exports = { ACCEPTANCE_WINDOW_MS, validateWebhook };
