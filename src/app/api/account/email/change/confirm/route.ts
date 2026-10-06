import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSecurityNoticeEmail } from "@/lib/mail/authMail";
import { recordSecurityNotice } from "@/lib/security/alerts";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import { verifyEmailOtp } from "@/lib/security/emailOtp";
import { readJson } from "@/lib/security/parseBody";
import { writeAudit } from "@/lib/admin/audit";
import { LIMITS, clientIp } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { roleForProfile } from "@/lib/security/rbac";
import { emailChangeConfirmSchema } from "@/lib/security/schemas";
import { attachSession, requireMutatingRequest, requireUser, revokeUserSessions } from "@/lib/security/session";
import { maskEmail, saveUser } from "@/lib/security/userStore";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;

  const limited = await throttle([{ key: `emailchgc:${auth.user.id}`, limit: LIMITS.emailOtp.limit, windowMs: LIMITS.emailOtp.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, emailChangeConfirmSchema);
  if (!parsed.ok) return parsed.response;
  const { email, otp } = parsed.data;
  if (!(await verifyEmailOtp(auth.user.id, otp, "email-change", email))) {
    return NextResponse.json({ ok: false, error: "complete.err.emailCode" }, { status: 401 });
  }
  const taken = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, NOT: { id: auth.user.id } },
    select: { id: true },
  });
  if (taken) return NextResponse.json({ ok: false, error: "auth.err.taken" }, { status: 409 });

  const oldEmail = auth.user.email;
  const profile = stampVerification({ ...auth.user.profile, email, emailVerified: true });
  const role = roleForProfile(profile.verified, auth.user.role);
  const user = await saveUser({ ...auth.user, email, role, profile: { ...profile, role } });
  const ended = await revokeUserSessions(user.id, "email-change", auth.session.id);
  await writeAudit({
    actorId: user.id,
    action: "auth.email_change",
    entityType: "security",
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    payload: { otherSessionsEnded: ended },
  });
  if (oldEmail) {
    await sendSecurityNoticeEmail(
      oldEmail,
      "E-posta adresiniz değiştirildi",
      `Hesabınızın e-posta adresi ${maskEmail(email)} olarak güncellendi.`,
    ).catch(() => undefined);
  }
  await recordSecurityNotice(
    user.id,
    "security.email",
    "E-posta adresiniz değiştirildi",
    `Hesabınızın e-posta adresi ${maskEmail(email)} olarak güncellendi.`,
  );
  const res = NextResponse.json({ ok: true, user: user.profile, needsProfile: !isProfileComplete(user.profile) });
  return attachSession(res, user);
}
