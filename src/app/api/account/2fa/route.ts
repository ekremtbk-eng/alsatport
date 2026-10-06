import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mailDebugEnabled, sendOtpEmail, sendSecurityNoticeEmail } from "@/lib/mail/authMail";
import { createEmailOtp, verifyEmailOtp } from "@/lib/security/emailOtp";
import { smsAvailableFor } from "@/lib/security/loginFlow";
import { readJson } from "@/lib/security/parseBody";
import { writeAudit } from "@/lib/admin/audit";
import { LIMITS, clientIp } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { twoFactorSchema } from "@/lib/security/schemas";
import { requireMutatingRequest, requireUser, revokeUserSessions } from "@/lib/security/session";
import { forgetTrustedDevice, trustDevice } from "@/lib/security/twoFactor";
import { findUserById, maskEmail, maskPhoneNumber, type StoredUser } from "@/lib/security/userStore";
import { otpSmsText, sendSms, smsReady } from "@/lib/sms";

function status(user: StoredUser) {
  const p = user.profile;
  return {
    enabled: !!p.twoFactorEnabled,
    method: p.twoFactorMethod === "sms" && smsAvailableFor(user) ? "sms" : "email",
    maskedEmail: maskEmail(user.email),
    maskedPhone: p.phone ? maskPhoneNumber(p.phone) : "",
    emailVerified: p.emailVerified === true,
    phoneVerified: !!p.phoneVerified,
    smsProvider: smsReady(),
    smsAvailable: smsAvailableFor(user),
  };
}

export async function GET() {
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  return NextResponse.json({ ok: true, ...status(auth.user) });
}

const NOTICE = {
  enable: ["İki aşamalı doğrulama açıldı", "Şifreyle girişlerde ek doğrulama kodu istenecek."],
  disable: ["İki aşamalı doğrulama kapatıldı", "Şifreyle girişlerde artık ek doğrulama kodu istenmeyecek."],
  method: ["İki aşamalı doğrulama yöntemi değişti", "Giriş doğrulama kodları artık seçtiğiniz yeni yönteme gönderilecek."],
} as const;

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;

  const limited = await throttle([{ key: `2fa:${auth.user.id}`, limit: LIMITS.emailOtp.limit, windowMs: LIMITS.emailOtp.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, twoFactorSchema);
  if (!parsed.ok) return parsed.response;
  const { action, change, otp } = parsed.data;
  const user = auth.user;
  const enabled = !!user.profile.twoFactorEnabled;
  const current = status(user).method;
  const method = change === "disable" ? current : parsed.data.method;

  if (change === "enable" && enabled) return NextResponse.json({ ok: false, error: "acct.2fa.already" }, { status: 400 });
  if (change === "disable" && !enabled) return NextResponse.json({ ok: false, error: "acct.2fa.already" }, { status: 400 });
  if (change === "method" && (!enabled || method === current)) {
    return NextResponse.json({ ok: false, error: "acct.2fa.already" }, { status: 400 });
  }
  if (method === "sms" && change !== "disable") {
    if (!smsReady()) return NextResponse.json({ ok: false, error: "acct.2fa.smsSoon" }, { status: 400 });
    if (!smsAvailableFor(user)) return NextResponse.json({ ok: false, error: "acct.2fa.smsNeedPhone" }, { status: 400 });
  }
  if (method === "email" && change !== "disable" && user.profile.emailVerified !== true) {
    return NextResponse.json({ ok: false, error: "acct.2fa.needEmail" }, { status: 400 });
  }

  /** The code is bound to the exact change so a code for one action cannot confirm another. */
  const bind = `${change}:${method}`;
  const viaSms = method === "sms" && smsAvailableFor(user);

  if (action === "start") {
    const code = await createEmailOtp(user.id, "2fa-setup", bind);
    const sent = viaSms
      ? await sendSms(user.profile.phone ?? "", otpSmsText(code, "setup"))
      : await sendOtpEmail(user.email, code, "2fa-setup");
    if (!sent.ok) {
      return NextResponse.json({ ok: false, error: viaSms ? "auth.err.sms" : "auth.err.mail" }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      via: viaSms ? "sms" : "email",
      maskedTarget: viaSms ? maskPhoneNumber(user.profile.phone ?? "") : maskEmail(user.email),
      maskedEmail: maskEmail(user.email),
      ...(mailDebugEnabled() ? { sandboxCode: code } : {}),
    });
  }

  if (!/^\d{6}$/.test(otp) || !(await verifyEmailOtp(user.id, otp, "2fa-setup", bind))) {
    return NextResponse.json({ ok: false, error: "auth.2fa.wrong" }, { status: 401 });
  }
  await prisma.profile.update({
    where: { userId: user.id },
    data: change === "disable" ? { twoFactorEnabled: false } : { twoFactorEnabled: true, twoFactorMethod: method },
  });
  // Turning 2FA on usually means the owner is worried: drop every other session so it takes effect immediately.
  if (change === "enable") await revokeUserSessions(user.id, "2fa-enabled", auth.session.id);
  await writeAudit({
    actorId: user.id,
    action: `auth.2fa_${change}`,
    entityType: "security",
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    payload: { method },
  });
  const fresh = (await findUserById(user.id))!;
  const [subject, body] = NOTICE[change];
  await sendSecurityNoticeEmail(user.email, subject, body).catch(() => undefined);
  const res = NextResponse.json({ ok: true, user: fresh.profile, ...status(fresh) });
  if (change === "enable") await trustDevice(res, user.id);
  if (change === "disable") forgetTrustedDevice(res);
  return res;
}
