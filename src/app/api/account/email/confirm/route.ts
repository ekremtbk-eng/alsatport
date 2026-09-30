import { NextResponse } from "next/server";
import { digitsOnly } from "@/lib/security/sanitize";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { attachSession, requireMutatingRequest, requireUser } from "@/lib/security/session";
import { saveUser } from "@/lib/security/userStore";
import { verifyEmailOtp } from "@/lib/security/emailOtp";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import { roleForProfile } from "@/lib/security/rbac";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;

  const ip = clientIp(req);
  const limited = rateLimit(`emailcfm:${ip}:${auth.user.id}`, LIMITS.emailOtp.limit, LIMITS.emailOtp.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const body = (await req.json().catch(() => null)) as { otp?: string } | null;
  const otp = digitsOnly(body?.otp, 6);
  if (otp.length !== 6 || !(await verifyEmailOtp(auth.user.id, otp))) {
    return NextResponse.json({ ok: false, error: "complete.err.emailCode" }, { status: 401 });
  }

  const profile = stampVerification({ ...auth.user.profile, emailVerified: true });
  const role = roleForProfile(profile.verified, auth.user.role);
  const user = await saveUser({ ...auth.user, role, profile: { ...profile, role } });
  const res = NextResponse.json({
    ok: true,
    user: user.profile,
    needsProfile: !isProfileComplete(user.profile),
  });
  return attachSession(res, user);
}
