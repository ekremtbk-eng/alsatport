import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { isLiveRow, newPeriod, notifyFavoriters, notifyListingEvent } from "@/lib/listings/lifecycle";
import { writeAudit } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import { requireAdmin, requireMutatingRequest, stepUpError } from "@/lib/security/session";
import { sanitizeText } from "@/lib/security/sanitize";
import { readJson } from "@/lib/security/parseBody";
import { adminListingActionSchema } from "@/lib/security/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const parsed = await readJson(req, adminListingActionSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (body.action === "remove") {
    const stale = stepUpError(auth.session);
    if (stale) return stale;
  }
  const existing = await prisma.listing.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });

  const wasLive = isLiveRow(existing);
  if (body?.action === "approve") {
    const row = await prisma.listing.update({
      where: { id },
      data: { status: "active", rejectedReason: null, soldAt: null, ...(wasLive ? {} : newPeriod()) },
      select: { id: true, title: true, sellerId: true, expiresAt: true },
    });
    if (!wasLive) after(() => notifyListingEvent(row, "listing.published"));
  } else if (body?.action === "reject") {
    const reason = sanitizeText(body.reason, 240);
    const row = await prisma.listing.update({
      where: { id },
      data: { status: "rejected", rejectedReason: reason || "rejected" },
      select: { id: true, title: true, sellerId: true, expiresAt: true },
    });
    after(() => notifyListingEvent(row, "listing.rejected", { extra: reason, unique: String(Date.now()) }));
  } else if (body?.action === "remove") {
    const row = await prisma.listing.update({
      where: { id },
      data: { status: "removed", deletedAt: new Date() },
      select: { id: true, title: true, sellerId: true, expiresAt: true },
    });
    after(async () => {
      await notifyListingEvent(row, "listing.removed");
      if (wasLive) await notifyFavoriters(row, "favorite.gone");
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
