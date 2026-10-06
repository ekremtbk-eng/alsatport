import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import type { Role } from "@/lib/security/rbac";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { adminUserPatchSchema } from "@/lib/security/schemas";
import { sanitizeText } from "@/lib/security/sanitize";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("admin");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  if (id === auth.user.id) {
    return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  }
  const parsed = await readJson(req, adminUserPatchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  const data: { bannedAt?: Date | null; role?: Role } = {};
  if (typeof body.banned === "boolean") data.bannedAt = body.banned ? new Date() : null;
  if (body.role === "member" || body.role === "seller") data.role = body.role;
  await prisma.user.update({ where: { id }, data });
  if (body.business) {
    const name = body.business.name ? sanitizeText(body.business.name, 120) : null;
    const verifiedAt = body.business.verified && name ? new Date() : null;
    await prisma.profile.updateMany({
      where: { userId: id },
      data: { businessName: name, businessVerifiedAt: verifiedAt },
    });
  }
  await writeAudit({
    actorId: auth.user.id,
    action: "user.patch",
    entityType: "user",
    entityId: id,
    payload: { banned: body.banned, role: body.role, business: body.business },
  });
  return NextResponse.json({ ok: true });
}
