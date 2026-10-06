import { NextResponse, after } from "next/server";
import { writeAudit } from "@/lib/admin/audit";
import { verifyEmailOtp, otpTimers } from "@/lib/security/emailOtp";
import { completeLogin, smsAvailableFor, verifiedRecoveryEmail } from "@/lib/security/loginFlow";
import { readJson } from "@/lib/security/parseBody";
import { clientIp } from "@/lib/security/rateLimit";
import { loginVerifySchema } from "@/lib/security/schemas";
import { requireMutatingRequest } from "@/lib/security/session";
import { THROTTLE, throttle, tooMany } from "@/lib/security/throttle";
import { clearLoginChallenge, readLoginChallenge, trustDevice } from "@/lib/security/twoFactor";
import { findUserById, maskEmail, maskPhoneNumber } from "@/lib/security/userStore";

/** Lets the login page resume a pending second step (e.g. after a Google redirect); only masked data is returned. */
export async function GET() {
  const userId = await readLoginChallenge();
  if (!userId) return NextResponse.json({ ok: false, error: "auth.2fa.expired" }, { status: 401 });
  const user = await findUserById(userId);
  if (!user || user.bannedAt) return NextResponse.json({ ok: false, error: "auth.2fa.expired" }, { status: 401 });
  const timers = await otpTimers(user.id, "login-2fa");
  if (timers.expiresIn <= 0) return NextResponse.json({ ok: false, error: "auth.2fa.expired" }, { status: 401 });
  const viaSms = user.profile.twoFactorMethod === "sms" && smsAvailableFor(user);
  const maskedTarget = viaSms ? maskPhoneNumber(user.profile.phone ?? "") : maskEmail(user.email);
  return NextResponse.json({
    ok: true,
    twoFactor: {
      method: viaSms ? "sms" : "email",
      maskedTarget,
      maskedEmail: maskedTarget,
      hasRecovery: !!(await verifiedRecoveryEmail(user.id)),
      canEmail: viaSms,
      ...timers,
    },
  });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const userId = await readLoginChallenge();
  if (!userId) return NextResponse.json({ ok: false, error: "auth.2fa.expired" }, { status: 401 });

  const ip = clientIp(req);
  const limited = await throttle(
    [
      { key: `otp-verify:login:${userId}`, ...THROTTLE.otpVerify },
      { key: `otp-verify:ip:${ip}`, limit: THROTTLE.otpVerify.limit * 4, windowMs: THROTTLE.otpVerify.windowMs },
    ],
    req,
  );
  if (!limited.ok) return tooMany(limited.retryAfter);

  const parsed = await readJson(req, loginVerifySchema);
  if (!parsed.ok) return parsed.response;
  const user = await findUserById(userId);
  if (!user || user.bannedAt) return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  if (!(await verifyEmailOtp(user.id, parsed.data.otp, "login-2fa"))) {
    after(() =>
      writeAudit({
        actorId: user.id,
        action: user.role === "admin" ? "admin.otp_failed" : "auth.otp_failed",
        entityType: "security",
        ip,
        userAgent: req.headers.get("user-agent"),
      }),
    );
    return NextResponse.json({ ok: false, error: "auth.2fa.wrong" }, { status: 401 });
  }
  const res = await completeLogin(user, req, { method: "otp", mfa: true });
  clearLoginChallenge(res);
  // Admins always re-verify; remembered devices apply to regular accounts only.
  if (parsed.data.trust && user.role !== "admin") await trustDevice(res, user.id);
  return res;
}
