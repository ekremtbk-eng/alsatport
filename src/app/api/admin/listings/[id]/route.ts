import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { sanitizeText } from "@/lib/security/sanitize";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("admin");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { action?: string; reason?: string } | null;
  const existing = await prisma.listing.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });

  if (body?.action === "approve") {
    await prisma.listing.update({
      where: { id },
      data: { status: "active", postedAt: new Date(), rejectedReason: null },
    });
  } else if (body?.action === "reject") {
    await prisma.listing.update({
      where: { id },
      data: { status: "rejected", rejectedReason: sanitizeText(body.reason, 240) || "rejected" },
    });
  } else if (body?.action === "remove") {
    await prisma.listing.update({
      where: { id },
      data: { status: "removed", deletedAt: new Date() },
    });
  } else {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  await writeAudit({
    actorId: auth.user.id,
    action: `listing.${body.action}`,
    entityType: "listing",
    entityId: id,
    payload: { reason: body.reason },
  });
  return NextResponse.json({ ok: true });
}
