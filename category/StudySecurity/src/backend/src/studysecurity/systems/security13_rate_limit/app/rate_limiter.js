function createLimiter(limit, windowMs) {
  const buckets = new Map();
  return function check(key, now = Date.now()) {
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now >= bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }
    bucket.count += 1;
    buckets.set(key, bucket);
    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      retryAfter: Math.max(0, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  };
}

module.exports = { createLimiter };
