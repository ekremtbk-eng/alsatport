import { NextResponse } from "next/server";
import { verifyPasswordHash } from "@/lib/security/password";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { prisma } from "@/lib/db";
import { findUserByIdentifier, saveUser } from "@/lib/security/userStore";
import { attachSession, requireMutatingRequest } from "@/lib/security/session";
import { promoteConfiguredAdmin } from "@/lib/admin/audit";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import { entitlementsChanged, reconcileEntitlements } from "@/lib/entitlements";
import { readJson } from "@/lib/security/parseBody";
import { loginBodySchema } from "@/lib/security/schemas";
import { isStrongPassword } from "@/lib/security/passwordPolicy";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const parsed = await readJson(req, loginBodySchema);
  if (!parsed.ok) return parsed.response;
  const ip = clientIp(req);
  const identifier = sanitizeText(parsed.data.identifier, 80);
  const password = parsed.data.password;

  const ipLimit = rateLimit(`login:${ip}`, LIMITS.login.limit, LIMITS.login.windowMs);
  const idLimit = rateLimit(`login-id:${identifier.toLowerCase()}`, LIMITS.login.limit, LIMITS.login.windowMs);
  if (!ipLimit.ok || !idLimit.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(Math.max(ipLimit.retryAfter, idLimit.retryAfter)) } },
    );
  }

  if (!identifier || !password || !isStrongPassword(password)) {
    return NextResponse.json({ ok: false, error: "auth.err.wrong" }, { status: 401 });
  }

  let user = await findUserByIdentifier(identifier);
  if (!user?.passwordHash) {
    return NextResponse.json({ ok: false, error: "auth.err.wrong" }, { status: 401 });
  }
  if (user.bannedAt) {
    return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  }
  const passwordHash = user.passwordHash;
  user = await promoteConfiguredAdmin(user);
  const ok = await verifyPasswordHash(password, passwordHash);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "auth.err.wrong" }, { status: 401 });
  }

  const stamped = reconcileEntitlements(stampVerification(user.profile));
  if (entitlementsChanged(user.profile, stamped) || stamped.verified !== user.profile.verified || stamped.profileComplete !== user.profile.profileComplete) {
    user = await saveUser({ ...user, profile: stamped });
  } else {
    user = { ...user, profile: stamped };
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const res = NextResponse.json({
    ok: true,
    needsProfile: !isProfileComplete(user.profile),
    needsEmailVerify: user.profile.emailVerified !== true,
    user: user.profile,
  });
  return attachSession(res, user);
}
