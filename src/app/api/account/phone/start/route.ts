import { NextResponse } from "next/server";
import { mailDebugEnabled, sendOtpEmail } from "@/lib/mail/authMail";
import { createEmailOtp } from "@/lib/security/emailOtp";
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
  const email = auth.user.profile.email || auth.user.email;
  if (!email) {
    return NextResponse.json({ ok: false, error: "auth.err.email" }, { status: 400 });
  }
  const limited = await throttle([{ key: `phoneotp:${auth.user.id}`, limit: LIMITS.emailOtp.limit, windowMs: LIMITS.emailOtp.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const otp = await createEmailOtp(auth.user.id, "phone");
  const sent = await sendOtpEmail(email, otp, "phone");
  if (!sent.ok) {
    return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
  }
  const masked = email.replace(/^(.).+(@.+)$/, "$1***$2");
  return NextResponse.json({
    ok: true,
    maskedEmail: masked,
    ...(mailDebugEnabled() ? { sandboxCode: otp } : {}),
  });
}
