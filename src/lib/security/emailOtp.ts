import "server-only";
import { prisma } from "@/lib/db";
import { sha256Secret } from "@/lib/security/hash";

export type OtpKind = "email" | "phone" | "email-change" | "2fa-setup" | "login-2fa" | "recovery-email";

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_RESEND_SECONDS = 60;
const MAX_ATTEMPTS: Partial<Record<OtpKind, number>> = { "login-2fa": 5 };

async function sha256(value: string) {
  return sha256Secret("email", value);
}

/** `bind` ties the code to extra data (e.g. the new address) so it cannot be replayed for another value. */
function material(kind: OtpKind, userId: string, otp: string, bind?: string) {
  return bind ? `${kind}:${userId}:${bind.toLowerCase()}:${otp}` : `${kind}:${userId}:${otp}`;
}

/** Issuing a new code overwrites the previous hash, so any earlier code stops working. */
export async function createEmailOtp(userId: string, kind: OtpKind = "email", bind?: string) {
  const otp = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  const hash = await sha256(material(kind, userId, otp, bind));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);
  await prisma.verificationOtp.upsert({
    where: { userId_kind: { userId, kind } },
    create: { userId, kind, hash, attempts: 0, expiresAt, createdAt: now },
    update: { hash, attempts: 0, expiresAt, createdAt: now },
  });
  return otp;
}

export async function verifyEmailOtp(userId: string, otp: string, kind: OtpKind = "email", bind?: string) {
  const row = await prisma.verificationOtp.findUnique({
    where: { userId_kind: { userId, kind } },
  });
  if (!row) return false;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.verificationOtp.delete({ where: { id: row.id } }).catch(() => undefined);
    return false;
  }
  const attempts = row.attempts + 1;
  if (attempts > (MAX_ATTEMPTS[kind] ?? 8)) {
    await prisma.verificationOtp.delete({ where: { id: row.id } }).catch(() => undefined);
    return false;
  }
  const hash = await sha256(material(kind, userId, otp, bind));
  if (hash !== row.hash) {
    await prisma.verificationOtp.update({ where: { id: row.id }, data: { attempts } });
    return false;
  }
  await prisma.verificationOtp.delete({ where: { id: row.id } }).catch(() => undefined);
  return true;
}

export async function hasPendingOtp(userId: string, kind: OtpKind) {
  const row = await prisma.verificationOtp.findUnique({ where: { userId_kind: { userId, kind } } });
  return !!row && row.expiresAt.getTime() > Date.now();
}

/** Seconds left on the pending code and until another one may be sent; zeros when nothing is pending. */
export async function otpTimers(userId: string, kind: OtpKind) {
  const row = await prisma.verificationOtp.findUnique({
    where: { userId_kind: { userId, kind } },
    select: { expiresAt: true, createdAt: true },
  });
  const now = Date.now();
  if (!row || row.expiresAt.getTime() <= now) return { expiresIn: 0, resendIn: 0 };
  return {
    expiresIn: Math.ceil((row.expiresAt.getTime() - now) / 1000),
    resendIn: Math.max(0, Math.ceil((row.createdAt.getTime() + OTP_RESEND_SECONDS * 1000 - now) / 1000)),
  };
}
