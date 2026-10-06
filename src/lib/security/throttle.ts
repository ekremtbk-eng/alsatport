import "server-only";
import { prisma } from "@/lib/db";
import { sha256Secret } from "@/lib/security/hash";
import { rateLimit } from "@/lib/security/rateLimit";

export type ThrottleSpec = { limit: number; windowMs: number };
export type ThrottleRule = { key: string } & ThrottleSpec;

/**
 * Shared (Postgres) fixed-window counter so limits hold across serverless instances.
 * Keys are hashed; raw e-mails/IPs never reach the table. Falls back to the per-instance
 * memory limiter if the database is unavailable.
 */
async function hitDb(rule: ThrottleRule) {
  const key = await sha256Secret("rl", rule.key);
  const resetAt = new Date(Date.now() + rule.windowMs);
  const rows = await prisma.$queryRaw<{ count: number; reset_at: Date }[]>`
    INSERT INTO rate_limit_buckets ("key", "count", "reset_at")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN rate_limit_buckets."reset_at" < now() THEN 1 ELSE rate_limit_buckets."count" + 1 END,
      "reset_at" = CASE WHEN rate_limit_buckets."reset_at" < now() THEN EXCLUDED."reset_at" ELSE rate_limit_buckets."reset_at" END
    RETURNING "count", "reset_at"`;
  const row = rows[0];
  if (!row) return { ok: true as const, retryAfter: 0 };
  const retryAfter = Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000));
  return row.count > rule.limit ? { ok: false as const, retryAfter } : { ok: true as const, retryAfter: 0 };
}

let lastSweep = 0;
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 10 * 60 * 1000) return;
  lastSweep = now;
  void prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(now - 60 * 60 * 1000) } } }).catch(() => undefined);
}

/** Every rule is counted; the request is rejected if any of them is over its limit. */
export async function throttle(rules: ThrottleRule[], req?: Request) {
  let retryAfter = 0;
  for (const rule of rules) {
    const mem = rateLimit(`t:${rule.key}`, rule.limit, rule.windowMs, req);
    if (!mem.ok) retryAfter = Math.max(retryAfter, mem.retryAfter);
    if (process.env.NODE_ENV !== "production" && process.env.THROTTLE_DB !== "1") continue;
    try {
      const db = await hitDb(rule);
      if (!db.ok) retryAfter = Math.max(retryAfter, db.retryAfter);
    } catch {
      /* memory limiter above still applies */
    }
  }
  sweep();
  return retryAfter > 0 ? { ok: false as const, retryAfter } : { ok: true as const, retryAfter: 0 };
}

export const THROTTLE = {
  loginIpId: { limit: 5, windowMs: 15 * 60 * 1000 },
  loginId: { limit: 15, windowMs: 60 * 60 * 1000 },
  loginIp: { limit: 30, windowMs: 15 * 60 * 1000 },
  otpVerify: { limit: 6, windowMs: 15 * 60 * 1000 },
  otpSend: { limit: 6, windowMs: 15 * 60 * 1000 },
  register: { limit: 5, windowMs: 60 * 60 * 1000 },
  forgotIp: { limit: 5, windowMs: 15 * 60 * 1000 },
  forgotAddr: { limit: 3, windowMs: 60 * 60 * 1000 },
  reset: { limit: 8, windowMs: 15 * 60 * 1000 },
  stepUp: { limit: 6, windowMs: 15 * 60 * 1000 },
  phoneReveal: { limit: 20, windowMs: 60 * 60 * 1000 },
  phoneRevealIp: { limit: 40, windowMs: 60 * 60 * 1000 },
  report: { limit: 12, windowMs: 60 * 60 * 1000 },
  message: { limit: 40, windowMs: 10 * 60 * 1000 },
  convoStart: { limit: 30, windowMs: 10 * 60 * 1000 },
  listing: { limit: 10, windowMs: 60 * 60 * 1000 },
  upload: { limit: 60, windowMs: 60 * 60 * 1000 },
  qr: { limit: 30, windowMs: 15 * 60 * 1000 },
} as const;

export function tooMany(retryAfter: number) {
  return Response.json(
    { ok: false, error: "auth.err.rateLimit" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
