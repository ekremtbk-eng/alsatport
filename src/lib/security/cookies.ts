export const COOKIE_ACCESS = "ap_session";
export const COOKIE_REFRESH = "ap_refresh";
export const COOKIE_CSRF = "ap_csrf";
export const COOKIE_DEVICE = "ap_did";

/**
 * Whether Set-Cookie should include `Secure`.
 *
 * Default: Secure in `NODE_ENV=production` (and always on Vercel).
 * Escape hatch for the isolated loopback test server only:
 *   ALSATPORT_LOOPBACK_TEST=1 + COOKIE_SECURE=0
 * Both flags are required. Vercel / Preview / Production deployments can never
 * disable Secure this way (VERCEL / VERCEL_ENV short-circuit to true).
 */
function vercelDeployment() {
  if (process.env.VERCEL) return true;
  const e = process.env.VERCEL_ENV;
  return e === "production" || e === "preview" || e === "development";
}

export function cookieSecure() {
  // Any Vercel deployment (incl. development) must keep Secure cookies.
  if (vercelDeployment()) return true;
  // Isolated loopback E2E launcher only (scripts/local-test-server.mjs).
  if (process.env.ALSATPORT_LOOPBACK_TEST === "1" && process.env.COOKIE_SECURE === "0") {
    return false;
  }
  return process.env.NODE_ENV === "production";
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function deviceCookieOptions() {
  return {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  };
}

export function csrfCookieOptions(maxAge: number) {
  return sessionCookieOptions(maxAge);
}
