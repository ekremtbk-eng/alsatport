import { NextResponse } from "next/server";
import { sendSignupVerificationEmail } from "@/lib/mail/authMail";
import { outboundMailReady } from "@/lib/mail/config";
import { LIMITS } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";

export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  if (auth.user.profile.emailVerified) {
    return NextResponse.json({ ok: true, already: true });
  }
  const email = auth.user.profile.email || auth.user.email;
  if (!email) {
    return NextResponse.json({ ok: false, error: "auth.err.email" }, { status: 400 });
  }
  const limited = await throttle([{ key: `emailotp:${auth.user.id}`, limit: LIMITS.emailOtp.limit, windowMs: LIMITS.emailOtp.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  if (!outboundMailReady()) {
    return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
  }
  const sent = await sendSignupVerificationEmail({
    userId: auth.user.id,
    email,
    name: auth.user.profile.fullName || auth.user.profile.displayName,
  });
  if (!sent.ok) {
    return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
  }
  const masked = email.replace(/^(.).+(@.+)$/, "$1***$2");
  return NextResponse.json({ ok: true, maskedEmail: masked, via: "link" });
}
