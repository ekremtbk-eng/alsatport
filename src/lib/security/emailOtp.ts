import "server-only";
import { prisma } from "@/lib/db";
import { sha256Secret } from "@/lib/security/hash";

async function sha256(value: string) {
  return sha256Secret("email", value);
}

function keyKind(kind: "email" | "phone") {
  return kind;
}

export async function createEmailOtp(userId: string, kind: "email" | "phone" = "email") {
  const otp = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  const hash = await sha256(`${kind}:${userId}:${otp}`);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.verificationOtp.upsert({
    where: { userId_kind: { userId, kind: keyKind(kind) } },
    create: { userId, kind: keyKind(kind), hash, attempts: 0, expiresAt },
    update: { hash, attempts: 0, expiresAt },
  });
  return otp;
}

export async function verifyEmailOtp(userId: string, otp: string, kind: "email" | "phone" = "email") {
  const row = await prisma.verificationOtp.findUnique({
    where: { userId_kind: { userId, kind: keyKind(kind) } },
  });
  if (!row) return false;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.verificationOtp.delete({ where: { id: row.id } }).catch(() => undefined);
    return false;
  }
  const attempts = row.attempts + 1;
  if (attempts > 8) {
    await prisma.verificationOtp.delete({ where: { id: row.id } }).catch(() => undefined);
    return false;
  }
  const hash = await sha256(`${kind}:${userId}:${otp}`);
  if (hash !== row.hash) {
    await prisma.verificationOtp.update({ where: { id: row.id }, data: { attempts } });
    return false;
  }
  await prisma.verificationOtp.delete({ where: { id: row.id } }).catch(() => undefined);
  return true;
}
