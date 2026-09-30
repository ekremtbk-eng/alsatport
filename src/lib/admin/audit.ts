import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { StoredUser } from "@/lib/security/userStore";
import { saveUser } from "@/lib/security/userStore";

export function adminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

export async function promoteConfiguredAdmin(user: StoredUser): Promise<StoredUser> {
  const email = adminEmail();
  if (!email || user.email.toLowerCase() !== email || user.role === "admin") return user;
  return saveUser({
    ...user,
    role: "admin",
    profile: { ...user.profile, role: "admin" },
  });
}

export async function writeAudit(input: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ip?: string;
  payload?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ip: input.ip && /^\d/.test(input.ip) ? input.ip : null,
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
    },
  }).catch(() => undefined);
}
