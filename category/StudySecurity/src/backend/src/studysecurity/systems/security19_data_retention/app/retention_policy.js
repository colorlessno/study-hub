const periods = { order: 365, inquiry: 180, audit: 1095 };
const DAY_MS = 86_400_000;

function deletionCandidates(records, today = new Date("2026-04-29")) {
  const evaluationDate = new Date(today);
  if (Number.isNaN(evaluationDate.getTime())) throw new TypeError("today must be a valid date");

  return records.map((r) => {
    const retentionDays = periods[r.type];
    if (!retentionDays) return { id: r.id, type: r.type, delete: false, reason: "unknown_type" };

    const updatedAt = new Date(r.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) return { id: r.id, type: r.type, delete: false, reason: "invalid_updated_at" };

    const ageDays = Math.floor((evaluationDate - updatedAt) / DAY_MS);
    if (ageDays < 0) return { id: r.id, type: r.type, delete: false, reason: "future_updated_at", ageDays, retentionDays };

    const expired = ageDays >= retentionDays;
    return {
      id: r.id,
      type: r.type,
      delete: expired && !r.legalHold,
      reason: r.legalHold ? "legal_hold" : expired ? "retention_expired" : "within_retention",
      ageDays,
      retentionDays,
    };
  });
}

module.exports = { deletionCandidates, periods };
