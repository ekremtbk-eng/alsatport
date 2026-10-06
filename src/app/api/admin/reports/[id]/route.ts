import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { sanitizeText } from "@/lib/security/sanitize";
import { readJson } from "@/lib/security/parseBody";
import { adminReportPatchSchema } from "@/lib/security/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("admin");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const parsed = await readJson(req, adminReportPatchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  await prisma.report.update({
    where: { id },
    data: {
      status: body.status,
      assignedAdminId: auth.user.id,
      resolution: sanitizeText(body.resolution, 400) || null,
    },
  });
  if (body.removeListing && report.listingId) {
    await prisma.listing.update({
      where: { id: report.listingId },
      data: { status: "removed", deletedAt: new Date() },
    });
  }
  let bannedSeller: string | null = null;
  if (body.banSeller && report.listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: report.listingId },
      select: { seller: { select: { id: true, role: true } } },
    });
    const seller = listing?.seller;
    if (seller && seller.role !== "admin" && seller.id !== auth.user.id) {
      await prisma.user.update({
        where: { id: seller.id },
        data: { bannedAt: new Date(), bannedReason: `report:${id}` },
      });
      bannedSeller = seller.id;
    }
  }
  await writeAudit({
    actorId: auth.user.id,
    action: "report.update",
    entityType: "report",
    entityId: id,
    payload: { status: body.status, removeListing: !!body.removeListing, bannedSeller },
  });
  return NextResponse.json({ ok: true });
}
