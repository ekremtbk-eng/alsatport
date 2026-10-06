import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { StoredUser } from "@/lib/security/userStore";
import { saveUser } from "@/lib/security/userStore";

export function adminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

/**
 * One-time bootstrap only: promotes the ADMIN_EMAIL account when the database has NO admin yet
 * and that account's e-mail is verified. Once any admin exists, roles change only in the database
 * (there is no API that grants `admin`).
 */
export async function promoteConfiguredAdmin(user: StoredUser): Promise<StoredUser> {
  const email = adminEmail();
  if (!email || user.role === "admin" || user.email.toLowerCase() !== email || !user.profile.emailVerified) return user;
  const admins = await prisma.user.count({ where: { role: "admin" } });
  if (admins > 0) return user;
  const promoted = await saveUser({ ...user, role: "admin", profile: { ...user.profile, role: "admin" } });
  await writeAudit({ actorId: user.id, action: "admin.bootstrap", entityType: "user", entityId: user.id });
  return promoted;
}

const SECRET_KEYS = /pass(word)?|otp|code|token|secret|hash|cookie|authorization/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth]";
  if (typeof value === "string") return value.replace(/[\r\n\u0000-\u001f]+/g, " ").slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SECRET_KEYS.test(k) ? "[redacted]" : scrub(v, depth + 1);
    return out;
  }
  return value;
}

/** Append-only audit trail; secret-looking keys are redacted and control characters stripped (log injection). */
export async function writeAudit(input: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ip?: string;
  userAgent?: string | null;
  payload?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action.slice(0, 80),
      entityType: input.entityType.slice(0, 40),
      entityId: input.entityId?.slice(0, 80),
      ip: input.ip && /^[0-9a-f:.]+$/i.test(input.ip) ? input.ip : null,
      userAgent: input.userAgent ? String(scrub(input.userAgent)).slice(0, 200) : null,
      payload: scrub(input.payload ?? {}) as Prisma.InputJsonValue,
    },
  }).catch(() => undefined);
}
