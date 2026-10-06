import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mailDebugEnabled, sendOtpEmail, sendSecurityNoticeEmail } from "@/lib/mail/authMail";
import { recordSecurityNotice } from "@/lib/security/alerts";
import { createEmailOtp, verifyEmailOtp } from "@/lib/security/emailOtp";
import { readJson } from "@/lib/security/parseBody";
import { LIMITS } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { recoveryEmailSchema } from "@/lib/security/schemas";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { findUserById, maskEmail } from "@/lib/security/userStore";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;

  const limited = await throttle([{ key: `recovery:${auth.user.id}`, limit: LIMITS.emailOtp.limit, windowMs: LIMITS.emailOtp.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, recoveryEmailSchema);
  if (!parsed.ok) return parsed.response;
  const { action, otp } = parsed.data;

  if (action === "remove") {
    await prisma.profile.update({
      where: { userId: auth.user.id },
      data: { recoveryEmail: null, recoveryEmailVerifiedAt: null },
    });
    await sendSecurityNoticeEmail(auth.user.email, "Kurtarma e-postası kaldırıldı", "Hesabınızdaki kurtarma e-postası kaldırıldı.").catch(
      () => undefined,
    );
    await recordSecurityNotice(auth.user.id, "security.recovery", "Kurtarma e-postası kaldırıldı", "Hesabınızdaki kurtarma e-postası kaldırıldı.");
    const user = (await findUserById(auth.user.id))!;
    return NextResponse.json({ ok: true, user: user.profile });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isValidEmail(email)) return NextResponse.json({ ok: false, error: "auth.err.email" }, { status: 400 });
  if (email === auth.user.email.toLowerCase()) {
    return NextResponse.json({ ok: false, error: "acct.recovery.same" }, { status: 400 });
  }

  if (action === "start") {
    const code = await createEmailOtp(auth.user.id, "recovery-email", email);
    const sent = await sendOtpEmail(email, code, "recovery-email");
    if (!sent.ok) return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
    return NextResponse.json({
      ok: true,
      maskedEmail: maskEmail(email),
      ...(mailDebugEnabled() ? { sandboxCode: code } : {}),
    });
  }

  if (!/^\d{6}$/.test(otp) || !(await verifyEmailOtp(auth.user.id, otp, "recovery-email", email))) {
    return NextResponse.json({ ok: false, error: "complete.err.emailCode" }, { status: 401 });
  }
  await prisma.profile.update({
    where: { userId: auth.user.id },
    data: { recoveryEmail: email, recoveryEmailVerifiedAt: new Date() },
  });
  await sendSecurityNoticeEmail(
    auth.user.email,
    "Kurtarma e-postası eklendi",
    `${maskEmail(email)} adresi hesabınıza kurtarma e-postası olarak eklendi.`,
  ).catch(() => undefined);
  await recordSecurityNotice(
    auth.user.id,
    "security.recovery",
    "Kurtarma e-postası eklendi",
    `${maskEmail(email)} adresi hesabınıza kurtarma e-postası olarak eklendi.`,
  );
  const user = (await findUserById(auth.user.id))!;
  return NextResponse.json({ ok: true, user: user.profile });
}
