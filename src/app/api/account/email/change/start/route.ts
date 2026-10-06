import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mailDebugEnabled, sendOtpEmail } from "@/lib/mail/authMail";
import { createEmailOtp } from "@/lib/security/emailOtp";
import { readJson } from "@/lib/security/parseBody";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { emailChangeStartSchema } from "@/lib/security/schemas";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { maskEmail } from "@/lib/security/userStore";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;

  const limited = rateLimit(`emailchg:${clientIp(req)}:${auth.user.id}`, LIMITS.emailOtp.limit, LIMITS.emailOtp.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, emailChangeStartSchema);
  if (!parsed.ok) return parsed.response;
  const email = parsed.data.email;
  if (email === auth.user.email.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "acct.email.same" }, { status: 400 });
  }
  const taken = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, NOT: { id: auth.user.id } },
    select: { id: true },
  });
  if (taken) return NextResponse.json({ ok: false, error: "auth.err.taken" }, { status: 409 });

  const otp = await createEmailOtp(auth.user.id, "email-change", email);
  const sent = await sendOtpEmail(email, otp, "email-change");
  if (!sent.ok) return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
  return NextResponse.json({
    ok: true,
    maskedEmail: maskEmail(email),
    ...(mailDebugEnabled() ? { sandboxCode: otp } : {}),
  });
}
