import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { isLiveRow, notifyFavoriters, notifyListingEvent } from "@/lib/listings/lifecycle";
import { sendSecurityNoticeEmail } from "@/lib/mail/authMail";
import { writeAudit } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import { requireAdmin, requireMutatingRequest, revokeUserSessions, stepUpError } from "@/lib/security/session";
import { sanitizeText } from "@/lib/security/sanitize";
import { readJson } from "@/lib/security/parseBody";
import { adminReportPatchSchema } from "@/lib/security/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const parsed = await readJson(req, adminReportPatchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (body.removeListing || body.banSeller) {
    const stale = stepUpError(auth.session);
    if (stale) return stale;
  }
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
    const before = await prisma.listing.findUnique({
      where: { id: report.listingId },
      select: { status: true, expiresAt: true, deletedAt: true },
    });
    const row = await prisma.listing.update({
      where: { id: report.listingId },
      data: { status: "removed", deletedAt: new Date() },
      select: { id: true, title: true, sellerId: true, expiresAt: true },
    });
    const wasLive = !!before && isLiveRow(before);
    after(async () => {
      await notifyListingEvent(row, "listing.removed");
      if (wasLive) await notifyFavoriters(row, "favorite.gone");
    });
  }
  let bannedSeller: string | null = null;
  if (body.banSeller && report.listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: report.listingId },
      select: { seller: { select: { id: true, role: true, email: true, bannedAt: true } } },
    });
    const seller = listing?.seller;
    if (seller && seller.role !== "admin" && seller.id !== auth.user.id) {
      await prisma.user.update({
        where: { id: seller.id },
        data: { bannedAt: new Date(), bannedReason: `report:${id}` },
      });
      await revokeUserSessions(seller.id, "banned");
      bannedSeller = seller.id;
      const to = seller.email;
      if (to && !seller.bannedAt) {
        after(() =>
          sendSecurityNoticeEmail(
            to,
            "Hesabınız askıya alındı",
            "AlsatPort hesabınız kullanım koşullarının ihlali nedeniyle askıya alındı. Bir hata olduğunu düşünüyorsanız destek ekibimizle iletişime geçebilirsiniz.",
          ).catch(() => undefined),
        );
      }
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
