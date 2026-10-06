import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";
import { sha256Secret } from "@/lib/security/hash";

export type OtpKind = "email" | "phone" | "email-change" | "2fa-setup" | "login-2fa" | "recovery-email" | "admin-step-up";

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_RESEND_SECONDS = 60;
const MAX_ATTEMPTS: Partial<Record<OtpKind, number>> = { "login-2fa": 5, "admin-step-up": 5 };

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function sha256(value: string) {
  return sha256Secret("email", value);
}

/** `bind` ties the code to extra data (e.g. the new address) so it cannot be replayed for another value. */
function material(kind: OtpKind, userId: string, otp: string, bind?: string) {
  return bind ? `${kind}:${userId}:${bind.toLowerCase()}:${otp}` : `${kind}:${userId}:${otp}`;
}

/** Issuing a new code overwrites the previous hash, so any earlier code stops working. */
export async function createEmailOtp(userId: string, kind: OtpKind = "email", bind?: string) {
  const otp = String(randomInt(100000, 1000000));
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
  const max = MAX_ATTEMPTS[kind] ?? 5;
  // Reserve the attempt atomically before comparing, so parallel guesses cannot exceed `max`.
  const reserved = await prisma.verificationOtp.updateMany({
    where: { id: row.id, hash: row.hash, attempts: { lt: max } },
    data: { attempts: { increment: 1 } },
  });
  if (reserved.count !== 1) {
    await prisma.verificationOtp.deleteMany({ where: { id: row.id, attempts: { gte: max } } }).catch(() => undefined);
    return false;
  }
  const hash = await sha256(material(kind, userId, otp, bind));
  if (!timingSafeEqualHex(hash, row.hash)) return false;
  // Single use: only the request that deletes the row wins.
  const consumed = await prisma.verificationOtp.deleteMany({ where: { id: row.id, hash: row.hash } });
  return consumed.count === 1;
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
