/**
 * Simple in-memory sliding windows. Fine for single-instance / best-effort
 * serverless (each instance has its own map). Prefer an external store later
 * if you need strict global limits.
 */

type Entry = { count: number; resetAt: number };

const stores = new Map<string, Map<string, Entry>>();

function store(name: string): Map<string, Entry> {
  let s = stores.get(name);
  if (!s) {
    s = new Map();
    stores.set(name, s);
  }
  return s;
}

function getEntry(bucket: string, key: string): Entry | undefined {
  const entry = store(bucket).get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.resetAt) {
    store(bucket).delete(key);
    return undefined;
  }
  return entry;
}

/** True if this key is already over the limit (does not increment). */
export function isRateLimited(
  bucket: string,
  key: string,
  limit: number
): boolean {
  const entry = getEntry(bucket, key);
  return !!entry && entry.count >= limit;
}

/** Increment the counter; returns false if the limit is already reached. */
export function checkRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  if (isRateLimited(bucket, key, limit)) return false;
  const s = store(bucket);
  const now = Date.now();
  const entry = getEntry(bucket, key);
  if (!entry) {
    s.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return true;
}

/** Record a failed attempt; returns false if the limit is now (or already) reached. */
export function recordRateLimitHit(
  bucket: string,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  return checkRateLimit(bucket, key, limit, windowMs);
}
