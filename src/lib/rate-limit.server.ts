/**
 * Server-side abuse control for expensive endpoints (AI calls, OCR).
 *
 * Fixed-window counter kept in the worker isolate. This is a first line of
 * defense against API abuse / brute-force / cost-drain bursts; the platform
 * edge still owns network-level DoS protection.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export type RateLimitOptions = {
  /** Logical endpoint name, e.g. "generate". */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export class RateLimitError extends Error {
  constructor(retryAfterSeconds: number) {
    super(`Too many requests. Please wait ${retryAfterSeconds}s and try again.`);
    this.name = "RateLimitError";
  }
}

/**
 * Identify the caller without logging or storing PII: prefer the authenticated
 * user id, otherwise a coarse network identifier from the request headers.
 */
export function callerKey(request: Request | undefined, userId?: string): string {
  if (userId) return `u:${userId}`;
  const h = request?.headers;
  const ip =
    h?.get("cf-connecting-ip") ??
    h?.get("x-real-ip") ??
    h?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anon";
  return `ip:${ip}`;
}

export function enforceRateLimit(key: string, opts: RateLimitOptions): void {
  const now = Date.now();
  const id = `${opts.name}:${key}`;
  const existing = buckets.get(id);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size > MAX_KEYS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
      if (buckets.size > MAX_KEYS) buckets.clear();
    }
    buckets.set(id, { count: 1, resetAt: now + opts.windowMs });
    return;
  }

  existing.count += 1;
  if (existing.count > opts.limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((existing.resetAt - now) / 1000)));
  }
}

/** Audit line with no PII, no payloads, no secrets — safe for security logs. */
export function auditEvent(event: string, meta: Record<string, string | number | boolean> = {}): void {
  const safe = Object.fromEntries(
    Object.entries(meta).filter(([k]) => !/token|key|secret|password|email|content|text|prompt/i.test(k)),
  );
  console.info(`[audit] ${event}`, JSON.stringify(safe));
}
