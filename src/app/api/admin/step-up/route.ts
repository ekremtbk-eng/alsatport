import { NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { sendOtpEmail } from "@/lib/mail/authMail";
import { OTP_TTL_SECONDS, createEmailOtp, otpTimers, verifyEmailOtp } from "@/lib/security/emailOtp";
import { readJson } from "@/lib/security/parseBody";
import { clientIp } from "@/lib/security/rateLimit";
import { otpField } from "@/lib/security/schemas";
import { STEP_UP_WINDOW_MS, requireAdmin, requireMutatingRequest } from "@/lib/security/session";
import { THROTTLE, throttle, tooMany } from "@/lib/security/throttle";
import { maskEmail } from "@/lib/security/userStore";

const stepUpSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("confirm"), otp: otpField }),
]);

/** Re-verifies the admin with a fresh e-mail code before destructive actions; the result is bound to this session only. */
export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const ip = clientIp(req);
  const limited = await throttle([{ key: `step-up:${auth.user.id}`, ...THROTTLE.stepUp }], req);
  if (!limited.ok) return tooMany(limited.retryAfter);
  const parsed = await readJson(req, stepUpSchema);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.action === "start") {
    const pending = await otpTimers(auth.user.id, "admin-step-up");
    if (pending.resendIn > 0) {
      return NextResponse.json({ ok: true, maskedEmail: maskEmail(auth.user.email), ...pending });
    }
    const code = await createEmailOtp(auth.user.id, "admin-step-up");
    const sent = await sendOtpEmail(auth.user.email, code, "login-2fa");
    if (!sent.ok) return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
    return NextResponse.json({ ok: true, maskedEmail: maskEmail(auth.user.email), expiresIn: OTP_TTL_SECONDS });
  }

  const ok = await verifyEmailOtp(auth.user.id, parsed.data.otp, "admin-step-up");
  after(() =>
    writeAudit({
      actorId: auth.user.id,
      action: ok ? "admin.step_up" : "admin.step_up_failed",
      entityType: "security",
      entityId: auth.session.id,
      ip,
      userAgent: req.headers.get("user-agent"),
    }),
  );
  if (!ok) return NextResponse.json({ ok: false, error: "auth.2fa.wrong" }, { status: 401 });
  await prisma.userSession.update({ where: { id: auth.session.id }, data: { stepUpAt: new Date() } });
  return NextResponse.json({ ok: true, validFor: Math.floor(STEP_UP_WINDOW_MS / 1000) });
}
