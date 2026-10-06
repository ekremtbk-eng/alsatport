import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_ACCESS, COOKIE_DEVICE, COOKIE_REFRESH, deviceCookieOptions } from "@/lib/security/cookies";
import { verifyAuthToken } from "@/lib/security/jwt";
import { LIMITS, clientRateKey, rateLimit } from "@/lib/security/rateLimit";
import { hasRole } from "@/lib/security/rbac";

const PROTECTED_PREFIXES = [
  "/ilan-ver",
  "/mesajlar",
  "/hesap-tamamla",
  "/ilanlarim",
  "/admin",
  "/profil",
  "/odeme",
  "/favoriler",
  "/bildirimler",
  "/bildirim-ayarlari",
  "/qr",
];

const EMAIL_HOLD_ALLOW = [
  "/eposta-dogrula",
  "/giris",
  "/kayit",
  "/sifre-unuttum",
  "/sifre-sifirla",
  "/kvkk",
  "/cerez-aydinlatma",
  "/gizlilik-politikasi",
  "/kullanim-kosullari",
  "/ilan-kurallari",
  "/kurumsal/iletisim",
];

function isEmailHoldAllowed(path: string) {
  if (path.startsWith("/api/")) return true;
  return EMAIL_HOLD_ALLOW.some((p) => path === p || path.startsWith(`${p}/`));
}

function nonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

function csp(n: string, dev: boolean) {
  const script = dev
    ? `'self' 'nonce-${n}' 'unsafe-eval' 'wasm-unsafe-eval'`
    : `'self' 'nonce-${n}' 'strict-dynamic' 'wasm-unsafe-eval'`;
  return [
    `default-src 'self'`,
    `script-src ${script} https://www.google.com https://www.gstatic.com https://www.recaptcha.net`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://images.unsplash.com https://plus.unsplash.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.googleusercontent.com https://*.fbcdn.net https://*.public.blob.vercel-storage.com https://www.gstatic.com https://www.google.com https://www.recaptcha.net`,
    `font-src 'self' data:`,
    `connect-src 'self' https://www.google.com https://www.gstatic.com https://www.recaptcha.net`,
    `frame-src https://www.openstreetmap.org https://www.google.com https://maps.google.com https://www.gstatic.com https://www.recaptcha.net https://recaptcha.google.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `worker-src 'self' blob: https://www.gstatic.com https://www.google.com https://www.recaptcha.net`,
    `manifest-src 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host === "www.alsatport.com") {
    const url = request.nextUrl.clone();
    url.hostname = "alsatport.com";
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const n = nonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", n);

  const path = request.nextUrl.pathname;
  if (path.startsWith("/api/") && !path.startsWith("/api/payments/webhook/") && !path.startsWith("/api/auth/oauth/")) {
    const write = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    const spec = write ? LIMITS.apiWrite : LIMITS.apiRead;
    const limited = rateLimit(clientRateKey(request, write ? "api-write" : "api-get"), spec.limit, spec.windowMs, request);
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "auth.err.rateLimit" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
      );
    }
  }
  const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (needsAuth) {
    const access = request.cookies.get(COOKIE_ACCESS)?.value;
    const refresh = request.cookies.get(COOKIE_REFRESH)?.value;
    const verified =
      (access ? await verifyAuthToken(access, "access") : null) ||
      (refresh ? await verifyAuthToken(refresh, "refresh") : null);
    // Pre-session-table tokens carry no `sid` and can no longer be revoked, so they count as signed out.
    const claims = verified && typeof verified.sid === "string" && verified.sid ? verified : null;
    if (!claims) {
      const next = `${path}${request.nextUrl.search}`;
      const url = request.nextUrl.clone();
      url.pathname = "/giris";
      url.search = "";
      url.searchParams.set("next", next.startsWith("/") && !next.startsWith("//") ? next : path);
      return NextResponse.redirect(url);
    }
    if (path === "/admin" || path.startsWith("/admin/")) {
      if (!hasRole(claims.role, "admin")) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    if (path.startsWith("/ilan-ver") && claims.role === "member" && claims.pc !== 1) {
      const next = `${path}${request.nextUrl.search}`;
      const url = request.nextUrl.clone();
      url.pathname = "/hesap-tamamla";
      url.search = "";
      url.searchParams.set("next", next.startsWith("/") && !next.startsWith("//") ? next : path);
      return NextResponse.redirect(url);
    }
  }

  const accessHold = request.cookies.get(COOKIE_ACCESS)?.value;
  const refreshHold = request.cookies.get(COOKIE_REFRESH)?.value;
  const holdClaims =
    (accessHold ? await verifyAuthToken(accessHold, "access") : null) ||
    (refreshHold ? await verifyAuthToken(refreshHold, "refresh") : null);
  if (holdClaims?.ev === 0 && !isEmailHoldAllowed(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/eposta-dogrula";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (!request.cookies.get(COOKIE_DEVICE)?.value) {
    res.cookies.set(COOKIE_DEVICE, crypto.randomUUID(), deviceCookieOptions());
  }
  const dev = process.env.NODE_ENV !== "production";
  res.headers.set("Content-Security-Policy", csp(n, dev));
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=()");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  res.headers.set("X-XSS-Protection", "0");
  if (!dev) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
