export const COOKIE_ACCESS = "ap_session";
export const COOKIE_REFRESH = "ap_refresh";
export const COOKIE_CSRF = "ap_csrf";
export const COOKIE_DEVICE = "ap_did";

export function cookieSecure() {
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
