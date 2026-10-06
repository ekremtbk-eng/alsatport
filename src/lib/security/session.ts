import "server-only";
import { after } from "next/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { UserSession } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  COOKIE_ACCESS,
  COOKIE_CSRF,
  COOKIE_DEVICE,
  COOKIE_REFRESH,
  sessionCookieOptions,
} from "@/lib/security/cookies";
import { csrfMatches, originAllowed } from "@/lib/security/csrf";
import {
  ACCESS_MAX_AGE,
  ADMIN_SESSION_MAX_AGE,
  REFRESH_MAX_AGE,
  signAccessToken,
  signRefreshToken,
  verifyAuthToken,
  type AccessClaims,
} from "@/lib/security/jwt";
import { hasRole, type Role } from "@/lib/security/rbac";
import { sha256Secret } from "@/lib/security/hash";
import { clientIp } from "@/lib/security/rateLimit";
import { findUserById, publicProfile, type StoredUser } from "@/lib/security/userStore";

export type SessionMethod = "password" | "otp" | "oauth" | "qr" | "register";

/** Admin step-up window for destructive actions (ban, role/business change, removals). */
export const STEP_UP_WINDOW_MS = 15 * 60 * 1000;
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

function sessionMaxAge(role: Role) {
  return role === "admin" ? ADMIN_SESSION_MAX_AGE : REFRESH_MAX_AGE;
}

export function maskIp(ip: string) {
  const v = ip.trim();
  if (!v || v === "unknown") return null;
  if (v.includes(".")) {
    const parts = v.replace(/^::ffff:/, "").split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.x.x` : null;
  }
  const hextets = v.split(":").filter(Boolean);
  return hextets.length >= 2 ? `${hextets[0]}:${hextets[1]}:…` : null;
}

async function deviceHash() {
  const did = (await cookies()).get(COOKIE_DEVICE)?.value ?? "";
  return did ? sha256Secret("device", did) : null;
}

function tokenPayload(user: StoredUser, sid: string) {
  return {
    sub: user.id,
    id: user.id,
    sid,
    role: user.role,
    email: user.email,
    username: user.username,
    pc: user.profile.profileComplete ? (1 as const) : (0 as const),
    ev: user.profile.emailVerified ? (1 as const) : (0 as const),
  };
}

async function setTokenCookies(res: NextResponse, user: StoredUser, session: Pick<UserSession, "id" | "expiresAt">) {
  const payload = tokenPayload(user, session.id);
  const refreshAge = Math.max(60, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
  res.cookies.set(COOKIE_ACCESS, await signAccessToken(payload), sessionCookieOptions(Math.min(ACCESS_MAX_AGE, refreshAge)));
  res.cookies.set(COOKIE_REFRESH, await signRefreshToken(payload, refreshAge), sessionCookieOptions(refreshAge));
}

type StartOpts = { method: SessionMethod; mfa?: boolean };

/**
 * Creates a brand-new server-side session (fresh id, so a pre-login token can never be fixated)
 * and sets the cookies. Use only after full authentication.
 */
export async function startSession(res: NextResponse, user: StoredUser, req: Request, opts: StartOpts) {
  const device = await deviceHash();
  const now = new Date();
  const [prior, seen] = await Promise.all([
    prisma.userSession.count({ where: { userId: user.id } }),
    device ? prisma.userSession.count({ where: { userId: user.id, deviceHash: device } }) : Promise.resolve(0),
  ]);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 200) || null;
  const ipMasked = maskIp(clientIp(req));
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      method: opts.method,
      deviceHash: device,
      userAgent: ua,
      ipMasked,
      mfaAt: opts.mfa ? now : null,
      expiresAt: new Date(now.getTime() + sessionMaxAge(user.role) * 1000),
    },
  });
  await setTokenCookies(res, user, session);

  const newDevice = prior > 0 && seen === 0;
  const ip = clientIp(req);
  after(async () => {
    const { writeAudit } = await import("@/lib/admin/audit");
    const { notifyNewDevice } = await import("@/lib/security/alerts");
    if (user.role === "admin") {
      await writeAudit({
        actorId: user.id,
        action: "admin.login",
        entityType: "security",
        entityId: session.id,
        ip,
        userAgent: ua,
        payload: { method: opts.method, mfa: !!opts.mfa, newDevice },
      });
    }
    if (newDevice) {
      await writeAudit({
        actorId: user.id,
        action: user.role === "admin" ? "admin.new_device" : "auth.new_device",
        entityType: "security",
        entityId: session.id,
        ip,
        userAgent: ua,
        payload: { method: opts.method },
      });
      await notifyNewDevice(user, { userAgent: ua, ipMasked, at: now });
    }
  });
  return session;
}

/** Re-signs tokens (e.g. after profile changes) for the session already in the cookies; never creates one. */
export async function attachSession(res: NextResponse, user: StoredUser) {
  const current = await currentSession();
  if (!current || current.session.userId !== user.id) return res;
  await setTokenCookies(res, user, current.session);
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

async function verifiedClaims(): Promise<{ claims: AccessClaims; fromRefresh: boolean } | null> {
  const jar = await cookies();
  const access = jar.get(COOKIE_ACCESS)?.value;
  if (access) {
    const claims = await verifyAuthToken(access, "access");
    if (claims) return { claims, fromRefresh: false };
  }
  const refresh = jar.get(COOKIE_REFRESH)?.value;
  if (!refresh) return null;
  const claims = await verifyAuthToken(refresh, "refresh");
  return claims ? { claims, fromRefresh: true } : null;
}

/**
 * Validates the cookie token AND the server-side session row (not revoked, not expired, same user).
 * Tokens issued before server-side sessions existed carry no `sid` and are rejected.
 */
export async function currentSession(): Promise<{ claims: AccessClaims; session: UserSession } | null> {
  const verified = await verifiedClaims();
  if (!verified) return null;
  const { claims, fromRefresh } = verified;
  if (typeof claims.sid !== "string" || !claims.sid) return null;
  const session = await prisma.userSession.findUnique({ where: { id: claims.sid } }).catch(() => null);
  if (!session || session.userId !== claims.sub || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  if (Date.now() - session.lastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS) {
    void prisma.userSession
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }
  if (fromRefresh) {
    try {
      const access = await signAccessToken({
        sub: claims.sub,
        id: claims.id ?? claims.sub,
        sid: session.id,
        role: claims.role,
        email: claims.email,
        username: claims.username,
        pc: claims.pc,
        ev: claims.ev ?? 0,
      });
      (await cookies()).set(COOKIE_ACCESS, access, sessionCookieOptions(ACCESS_MAX_AGE));
    } catch {
      /* read-only cookie context (RSC); the refresh token keeps working until its own expiry */
    }
  }
  return { claims, session };
}

export async function claimsFromCookies(): Promise<AccessClaims | null> {
  return (await currentSession())?.claims ?? null;
}

export async function revokeSession(sid: string, reason: string) {
  await prisma.userSession
    .updateMany({ where: { id: sid, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } })
    .catch(() => undefined);
}

/**
 * Ends every session of the user (optionally keeping one) and bumps `securityVersion`,
 * which also invalidates all "remember this device" tokens.
 */
export async function revokeUserSessions(userId: string, reason: string, keepSid?: string) {
  const res = await prisma.userSession.updateMany({
    where: { userId, revokedAt: null, ...(keepSid ? { id: { not: keepSid } } : {}) },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
  await prisma.user.update({ where: { id: userId }, data: { securityVersion: { increment: 1 } } }).catch(() => undefined);
  return res.count;
}

function deny(status: number, error: string) {
  return { error: NextResponse.json({ ok: false, error }, { status }) };
}

export async function requireUser(minRole: Role = "member", opts?: { allowUnverified?: boolean }) {
  const current = await currentSession();
  if (!current) return deny(401, "auth.err.session");
  const user = await findUserById(current.claims.sub);
  if (!user) return deny(401, "auth.err.session");
  if (user.bannedAt) {
    await revokeSession(current.session.id, "banned");
    return deny(403, "auth.err.forbidden");
  }
  if (!hasRole(user.role, minRole)) return deny(403, "auth.err.forbidden");
  if (!opts?.allowUnverified && !user.profile.emailVerified) return deny(403, "auth.err.emailUnverified");
  return { user, profile: publicProfile(user), claims: current.claims, session: current.session };
}

/**
 * Admin gate: role is read from the database (never from the token or request), the session
 * must have passed a second factor, and destructive actions need a fresh step-up.
 */
export async function requireAdmin(opts?: { stepUp?: boolean }) {
  const auth = await requireUser("admin");
  if ("error" in auth) return auth;
  if (!auth.session.mfaAt) return deny(403, "auth.err.adminMfa");
  if (opts?.stepUp) {
    const err = stepUpError(auth.session);
    if (err) return { error: err };
  }
  return auth;
}

/** Response to return when a destructive admin action lacks a second factor in the last 15 minutes. */
export function stepUpError(session: Pick<UserSession, "stepUpAt" | "mfaAt">) {
  const fresh = [session.stepUpAt, session.mfaAt]
    .filter((d): d is Date => !!d)
    .some((d) => Date.now() - d.getTime() < STEP_UP_WINDOW_MS);
  return fresh ? null : NextResponse.json({ ok: false, error: "auth.err.stepUp" }, { status: 403 });
}

/** Fresh-login check for sensitive account changes without a current password (e.g. adding one to a Google account). */
export function sessionIsFresh(session: Pick<UserSession, "createdAt" | "stepUpAt">, windowMs = STEP_UP_WINDOW_MS) {
  return [session.createdAt, session.stepUpAt]
    .filter((d): d is Date => !!d)
    .some((d) => Date.now() - d.getTime() < windowMs);
}
