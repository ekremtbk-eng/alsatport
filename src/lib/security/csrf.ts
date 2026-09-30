import { COOKIE_CSRF } from "@/lib/security/cookies";
import { CANONICAL_ORIGIN } from "@/lib/site";

export function newCsrfToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function readCsrfCookie(cookieHeader: string | null) {
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const hit = parts.find((p) => p.startsWith(`${COOKIE_CSRF}=`));
  return hit ? decodeURIComponent(hit.slice(COOKIE_CSRF.length + 1)) : "";
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function csrfMatches(req: Request) {
  const header = req.headers.get("x-csrf-token") ?? "";
  const cookie = readCsrfCookie(req.headers.get("cookie"));
  if (!header || !cookie || header.length < 32) return false;
  return timingSafeEqual(header, cookie);
}

export function originAllowed(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const allowed = new Set<string>([CANONICAL_ORIGIN]);
  try {
    allowed.add(new URL(req.url).origin);
  } catch {
    /* ignore */
  }
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3001");
    allowed.add("http://127.0.0.1:3001");
    allowed.add("http://localhost:3000");
  }
  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}
