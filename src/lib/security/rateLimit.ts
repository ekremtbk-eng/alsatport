import { COOKIE_DEVICE } from "@/lib/security/cookies";

type Bucket = { count: number; resetAt: number };

const g = globalThis as unknown as { __apRate?: Map<string, Bucket> };
const store = g.__apRate ?? new Map<string, Bucket>();
g.__apRate = store;

function isLoopback(value: string) {
  const v = value.trim().toLowerCase();
  return (
    !v ||
    v === "unknown" ||
    v === "::1" ||
    v === "127.0.0.1" ||
    v === "0:0:0:0:0:0:0:1" ||
    v.startsWith("127.") ||
    v.startsWith("::ffff:127.")
  );
}

export function isLocalDevRequest(req?: Request) {
  if (process.env.NODE_ENV !== "production") return true;
  if (!req) return false;
  const host = (req.headers.get("host") ?? "").split(":")[0]?.toLowerCase() ?? "";
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1") return true;
  return isLoopback(clientIp(req));
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim() || "";
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return process.env.NODE_ENV !== "production" ? "127.0.0.1" : "unknown";
}

export function clientRateKey(req: Request, kind: string) {
  const ip = clientIp(req);
  const raw = req.headers.get("cookie") ?? "";
  const did = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_DEVICE}=([^;]+)`))?.[1]?.trim() ?? "";
  const who = !isLoopback(ip) ? ip : did || "local";
  return `${kind}:${who}`;
}

export function rateLimit(key: string, limit: number, windowMs: number, req?: Request) {
  if (isLocalDevRequest(req)) {
    return { ok: true as const, remaining: limit, retryAfter: 0 };
  }
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: limit - 1, retryAfter: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false as const, remaining: 0, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true as const, remaining: limit - bucket.count, retryAfter: 0 };
}

export const LIMITS = {
  login: { limit: 5, windowMs: 15 * 60 * 1000 },
  register: { limit: 3, windowMs: 60 * 60 * 1000 },
  listing: { limit: 10, windowMs: 60 * 60 * 1000 },
  upload: { limit: 40, windowMs: 60 * 60 * 1000 },
  message: { limit: 30, windowMs: 60 * 1000 },
  profile: { limit: 20, windowMs: 60 * 60 * 1000 },
  oauth: { limit: 40, windowMs: 15 * 60 * 1000 },
  paytr: { limit: 8, windowMs: 15 * 60 * 1000 },
  emailOtp: { limit: 8, windowMs: 15 * 60 * 1000 },
  forgot: { limit: 5, windowMs: 15 * 60 * 1000 },
  report: { limit: 12, windowMs: 60 * 60 * 1000 },
  avatar: { limit: 8, windowMs: 60 * 60 * 1000 },
  apiRead: { limit: 120, windowMs: 60 * 1000 },
  apiWrite: { limit: 40, windowMs: 60 * 1000 },
} as const;
