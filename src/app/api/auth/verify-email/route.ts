import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth";
import { verifyEmailVerifyToken } from "@/lib/security/emailVerify";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { attachSession } from "@/lib/security/session";
import { findUserById, saveUser } from "@/lib/security/userStore";
import { stampVerification } from "@/lib/profile";
import { roleForProfile } from "@/lib/security/rbac";

function redirectTo(req: Request, ok: boolean) {
  const dest = new URL("/eposta-dogrula", req.url);
  dest.searchParams.set(ok ? "ok" : "err", "1");
  return NextResponse.redirect(dest);
}

export async function GET(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit(`emailverify:${ip}`, LIMITS.emailOtp.limit, LIMITS.emailOtp.windowMs, req);
  if (!limited.ok) return redirectTo(req, false);

  const token = new URL(req.url).searchParams.get("token") ?? "";
  const parsed = token ? await verifyEmailVerifyToken(token) : null;
  if (!parsed) return redirectTo(req, false);

  const user = await findUserById(parsed.userId);
  if (!user || user.bannedAt) return redirectTo(req, false);
  if (normalizeEmail(user.email) !== parsed.email) return redirectTo(req, false);

  if (user.profile.emailVerified) {
    const dest = redirectTo(req, true);
    return attachSession(dest, user);
  }

  const profile = stampVerification({ ...user.profile, emailVerified: true });
  const role = roleForProfile(profile.verified, user.role);
  const saved = await saveUser({ ...user, role, profile: { ...profile, role } });
  const dest = redirectTo(req, true);
  return attachSession(dest, saved);
}
