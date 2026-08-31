function maskPii(text) {
  return String(text || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b0\d{1,4}-\d{1,4}-\d{3,4}\b/g, "[phone]")
    .replace(/\bCUST-\d{4,}\b/g, "[customer-id]");
}

module.exports = { maskPii };
