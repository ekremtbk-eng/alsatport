import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import { digitsOnly } from "@/lib/security/sanitize";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { attachSession, requireMutatingRequest, requireUser } from "@/lib/security/session";
import { findUserById, saveUser } from "@/lib/security/userStore";
import { verifyEmailOtp } from "@/lib/security/emailOtp";
import { roleForProfile } from "@/lib/security/rbac";
import { readJson } from "@/lib/security/parseBody";
import { otpBodySchema } from "@/lib/security/schemas";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;

  const ip = clientIp(req);
  const limited = rateLimit(`phonecfm:${ip}:${auth.user.id}`, LIMITS.emailOtp.limit, LIMITS.emailOtp.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, otpBodySchema);
  if (!parsed.ok) return parsed.response;
  const otp = digitsOnly(parsed.data.otp, 6);
  if (otp.length !== 6 || !(await verifyEmailOtp(auth.user.id, otp, "phone"))) {
    return NextResponse.json({ ok: false, error: "complete.err.emailCode" }, { status: 401 });
  }

  await prisma.profile.update({
    where: { userId: auth.user.id },
    data: { phoneVerifiedAt: new Date() },
  });
  const reloaded = await findUserById(auth.user.id);
  if (!reloaded) {
    return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 401 });
  }
  const profile = stampVerification({ ...reloaded.profile, phoneVerified: true });
  const role = roleForProfile(profile.verified, reloaded.role);
  const user = await saveUser({ ...reloaded, role, profile: { ...profile, role, phoneVerified: true } });
  const res = NextResponse.json({
    ok: true,
    user: user.profile,
    needsProfile: !isProfileComplete(user.profile),
  });
  return attachSession(res, user);
}
