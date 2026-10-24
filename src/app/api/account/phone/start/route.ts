import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mailDebugEnabled } from "@/lib/mail/authMail";
import { createEmailOtp } from "@/lib/security/emailOtp";
import { otpSmsText, sendSms, smsReady } from "@/lib/sms";
import { LIMITS } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  if (auth.user.profile.phoneVerified) {
    return NextResponse.json({ ok: true, already: true });
  }
  if (!auth.user.profile.phone) {
    return NextResponse.json({ ok: false, error: "complete.err.phone" }, { status: 400 });
  }
  if (!smsReady()) {
    return NextResponse.json({ ok: false, error: "phone.err.smsOff" }, { status: 503 });
  }
  const limited = await throttle([{ key: `phoneotp:${auth.user.id}`, limit: LIMITS.emailOtp.limit, windowMs: LIMITS.emailOtp.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const otp = await createEmailOtp(auth.user.id, "phone", "sms");
  const sent = await sendSms(auth.user.profile.phone, otpSmsText(otp, "phone"));
  if (!sent.ok) {
    await prisma.verificationOtp.deleteMany({ where: { userId: auth.user.id, kind: "phone" } });
    return NextResponse.json({ ok: false, error: "phone.err.smsOff" }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    channel: "sms",
    ...(mailDebugEnabled() ? { sandboxCode: otp } : {}),
  });
}
