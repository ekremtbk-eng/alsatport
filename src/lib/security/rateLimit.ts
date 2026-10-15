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
  // Host and forwarding headers are client-controlled; never trust them on the real platform.
  if (!req || process.env.VERCEL) return false;
  if (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip")) return false;
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

const DEVICE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function deviceId(req: Request) {
  const raw = req.headers.get("cookie") ?? "";
  const did = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE_DEVICE}=([^;]+)`))?.[1]?.trim() ?? "";
  return DEVICE_ID.test(did) ? did.toLowerCase() : "";
}

/**
 * General API budget. Each browser (device cookie) gets its own bucket so people behind one shared IP
 * (office, mobile carrier NAT) do not exhaust each other's quota; a wider per-IP ceiling still caps a
 * client that rotates or drops the cookie. Requests without a valid device cookie share one bucket per IP.
 */
export function apiRateLimit(req: Request, write: boolean) {
  const spec = write ? LIMITS.apiWrite : LIMITS.apiRead;
  const kind = write ? "api-write" : "api-get";
  const ip = clientIp(req);
  const did = deviceId(req);
  if (isLoopback(ip)) return rateLimit(`${kind}:${did || "local"}`, spec.limit, spec.windowMs, req);
  const own = rateLimit(`${kind}:${ip}:${did || "-"}`, spec.limit, spec.windowMs, req);
  if (!own.ok) return own;
  const shared = write ? LIMITS.apiWriteIp : LIMITS.apiReadIp;
  return rateLimit(`${kind}-ip:${ip}`, shared.limit, shared.windowMs, req);
}

const PRUNE_AT = 20_000;

export function rateLimit(key: string, limit: number, windowMs: number, req?: Request) {
  if (isLocalDevRequest(req)) {
    return { ok: true as const, remaining: limit, retryAfter: 0 };
  }
  const now = Date.now();
  if (store.size > PRUNE_AT) {
    for (const [k, b] of store) if (b.resetAt < now) store.delete(k);
  }
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
  apiReadIp: { limit: 480, windowMs: 60 * 1000 },
  apiWriteIp: { limit: 160, windowMs: 60 * 1000 },
} as const;
