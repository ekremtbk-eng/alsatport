import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { entitlementsChanged, reconcileEntitlements } from "@/lib/entitlements";
import { mailDebugEnabled, sendOtpEmail } from "@/lib/mail/authMail";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import { OTP_RESEND_SECONDS, OTP_TTL_SECONDS, createEmailOtp, otpTimers } from "@/lib/security/emailOtp";
import { promoteConfiguredAdmin } from "@/lib/admin/audit";
import { startSession, type SessionMethod } from "@/lib/security/session";
import { isTrustedDevice } from "@/lib/security/twoFactor";
import { maskEmail, maskPhoneNumber, saveUser, type StoredUser } from "@/lib/security/userStore";
import { normalizeTrMobile, otpSmsText, sendSms, smsReady } from "@/lib/sms";

/** Called only after every required factor passed; always issues a brand-new server-side session. */
export async function completeLogin(
  input: StoredUser,
  req: Request,
  opts: { method: SessionMethod; mfa?: boolean },
  extra?: Record<string, unknown>,
) {
  let user = await promoteConfiguredAdmin(input);
  const stamped = reconcileEntitlements(stampVerification(user.profile));
  if (
    entitlementsChanged(user.profile, stamped) ||
    stamped.verified !== user.profile.verified ||
    stamped.profileComplete !== user.profile.profileComplete
  ) {
    user = await saveUser({ ...user, profile: stamped });
  } else {
    user = { ...user, profile: stamped };
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const res = NextResponse.json({
    ok: true,
    needsProfile: !isProfileComplete(user.profile),
    needsEmailVerify: user.profile.emailVerified !== true,
    user: user.profile,
    ...extra,
  });
  await startSession(res, user, req, opts);
  return res;
}

/** Admins always need a second factor; other users only when they enabled 2FA on an untrusted device. */
export async function needsSecondFactor(user: StoredUser) {
  if (user.role === "admin") return true;
  return user.profile.twoFactorEnabled && !(await isTrustedDevice(user.id));
}

export async function verifiedRecoveryEmail(userId: string) {
  const row = await prisma.profile.findUnique({
    where: { userId },
    select: { recoveryEmail: true, recoveryEmailVerifiedAt: true },
  });
  return row?.recoveryEmail && row.recoveryEmailVerifiedAt ? row.recoveryEmail : null;
}

/** SMS is used only while the provider is live and the number is verified; otherwise email keeps the account reachable. */
export function smsAvailableFor(user: StoredUser) {
  return smsReady() && !!user.profile.phoneVerified && !!normalizeTrMobile(user.profile.phone ?? "");
}

export type LoginCodeChannel = "primary" | "recovery" | "email";

/**
 * Sends the second-step login code; returns only the masked target and timers to the client.
 * Within the resend cooldown no new code is issued and the pending one stays valid.
 */
export async function sendLoginCode(user: StoredUser, to: LoginCodeChannel = "primary") {
  const recovery = await verifiedRecoveryEmail(user.id);
  const viaSms = to === "primary" && user.profile.twoFactorMethod === "sms" && smsAvailableFor(user);
  const email = to === "recovery" && recovery ? recovery : user.email;
  const maskedTarget = viaSms ? maskPhoneNumber(user.profile.phone ?? "") : maskEmail(email);
  const base = {
    method: viaSms ? ("sms" as const) : ("email" as const),
    maskedTarget,
    maskedEmail: maskedTarget,
    hasRecovery: !!recovery,
    canEmail: viaSms,
  };
  const pending = await otpTimers(user.id, "login-2fa");
  if (pending.resendIn > 0) {
    return { ok: true, cooling: true, ...base, ...pending };
  }
  const otp = await createEmailOtp(user.id, "login-2fa");
  if (viaSms && (await sendSms(user.profile.phone ?? "", otpSmsText(otp, "login"))).ok) {
    return {
      ok: true,
      cooling: false,
      ...base,
      expiresIn: OTP_TTL_SECONDS,
      resendIn: OTP_RESEND_SECONDS,
      ...(mailDebugEnabled() ? { sandboxCode: otp } : {}),
    };
  }
  const sent = await sendOtpEmail(email, otp, "login-2fa");
  const fallback = viaSms ? { method: "email" as const, maskedTarget: maskEmail(email), maskedEmail: maskEmail(email), canEmail: false } : {};
  return {
    ok: sent.ok,
    cooling: false,
    ...base,
    ...fallback,
    expiresIn: OTP_TTL_SECONDS,
    resendIn: OTP_RESEND_SECONDS,
    ...(mailDebugEnabled() ? { sandboxCode: otp } : {}),
  };
}
