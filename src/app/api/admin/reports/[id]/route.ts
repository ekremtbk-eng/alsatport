import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { sanitizeText } from "@/lib/security/sanitize";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("admin");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as {
    status?: "reviewing" | "resolved" | "dismissed";
    resolution?: string;
    removeListing?: boolean;
  } | null;
  const status = body?.status;
  if (status !== "reviewing" && status !== "resolved" && status !== "dismissed") {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  await prisma.report.update({
    where: { id },
    data: {
      status,
      assignedAdminId: auth.user.id,
      resolution: sanitizeText(body?.resolution, 400) || null,
    },
  });
  if (body?.removeListing && report.listingId) {
    await prisma.listing.update({
      where: { id: report.listingId },
      data: { status: "removed", deletedAt: new Date() },
    });
  }
  await writeAudit({
    actorId: auth.user.id,
    action: "report.update",
    entityType: "report",
    entityId: id,
    payload: { status, removeListing: !!body?.removeListing },
  });
  return NextResponse.json({ ok: true });
}
