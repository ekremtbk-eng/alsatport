import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  COOKIE_ACCESS,
  COOKIE_CSRF,
  COOKIE_REFRESH,
  sessionCookieOptions,
} from "@/lib/security/cookies";
import { csrfMatches, originAllowed } from "@/lib/security/csrf";
import {
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  signAccessToken,
  signRefreshToken,
  verifyAuthToken,
  type AccessClaims,
} from "@/lib/security/jwt";
import { hasRole, type Role } from "@/lib/security/rbac";
import { promoteConfiguredAdmin } from "@/lib/admin/audit";
import { findUserById, publicProfile, type StoredUser } from "@/lib/security/userStore";

export async function claimsFromCookies(): Promise<AccessClaims | null> {
  const jar = await cookies();
  const access = jar.get(COOKIE_ACCESS)?.value;
  if (access) {
    const claims = await verifyAuthToken(access, "access");
    if (claims) return claims;
  }
  const refresh = jar.get(COOKIE_REFRESH)?.value;
  if (!refresh) return null;
  return verifyAuthToken(refresh, "refresh");
}

export async function attachSession(res: NextResponse, user: StoredUser) {
  const payload = {
    sub: user.id,
    id: user.id,
    role: user.role,
    email: user.email,
    username: user.username,
    pc: user.profile.profileComplete ? (1 as const) : (0 as const),
    ev: user.profile.emailVerified ? (1 as const) : (0 as const),
  };
  const access = await signAccessToken(payload);
  const refresh = await signRefreshToken(payload);
  res.cookies.set(COOKIE_ACCESS, access, sessionCookieOptions(ACCESS_MAX_AGE));
  res.cookies.set(COOKIE_REFRESH, refresh, sessionCookieOptions(REFRESH_MAX_AGE));
  return res;
}

export function clearSession(res: NextResponse) {
  res.cookies.set(COOKIE_ACCESS, "", sessionCookieOptions(0));
  res.cookies.set(COOKIE_REFRESH, "", sessionCookieOptions(0));
  return res;
}

export function attachCsrf(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_CSRF, token, sessionCookieOptions(REFRESH_MAX_AGE));
  return res;
}

export async function requireMutatingRequest(req: Request) {
  if (!originAllowed(req)) {
    return NextResponse.json({ ok: false, error: "auth.err.csrf" }, { status: 403 });
  }
  if (!csrfMatches(req)) {
    return NextResponse.json({ ok: false, error: "auth.err.csrf" }, { status: 403 });
  }
  return null;
}

export async function requireUser(minRole: Role = "member", opts?: { allowUnverified?: boolean }) {
  const claims = await claimsFromCookies();
  if (!claims) {
    return { error: NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 401 }) };
  }
  let user = await findUserById(claims.sub);
  if (!user) {
    return { error: NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 401 }) };
  }
  user = await promoteConfiguredAdmin(user);
  if (user.bannedAt) {
    return { error: NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 }) };
  }
  if (!hasRole(user.role, minRole)) {
    return { error: NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 }) };
  }
  if (!opts?.allowUnverified && !user.profile.emailVerified) {
    return { error: NextResponse.json({ ok: false, error: "auth.err.emailUnverified" }, { status: 403 }) };
  }
  return { user, profile: publicProfile(user), claims };
}
