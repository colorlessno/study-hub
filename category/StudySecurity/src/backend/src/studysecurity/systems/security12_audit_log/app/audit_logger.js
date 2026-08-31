function mask(value) {
  return String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/gi, "[email]")
    .replace(/example-[a-z0-9_-]+/gi, "[secret]");
}

function audit(event) {
  const record = {
    at: new Date().toISOString(),
    actor: mask(event.actor),
    action: mask(event.action),
    target: mask(event.target),
    result: mask(event.result),
    reason: mask(event.reason || ""),
    requestId: mask(event.requestId),
  };
  console.log(JSON.stringify(record));
  return record;
}

module.exports = { audit, mask };
