import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import { isLiveRow } from "@/lib/listings/lifecycle";
import { clientIp } from "@/lib/security/rateLimit";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { THROTTLE, throttle, tooMany } from "@/lib/security/throttle";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Seller numbers are never part of listing payloads; each one is revealed on demand to a signed-in,
 * verified account, with per-account and per-IP caps so a single login cannot harvest numbers in bulk.
 */
export async function POST(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });

  const ip = clientIp(req);
  const limited = await throttle(
    [
      { key: `phone:user:${auth.user.id}`, ...THROTTLE.phoneReveal },
      { key: `phone:ip:${ip}`, ...THROTTLE.phoneRevealIp },
    ],
    req,
  );
  if (!limited.ok) {
    after(() =>
      writeAudit({
        actorId: auth.user.id,
        action: "abuse.phone_reveal_limit",
        entityType: "listing",
        entityId: id,
        ip,
        userAgent: req.headers.get("user-agent"),
      }),
    );
    return tooMany(limited.retryAfter);
  }

  const row = await prisma.listing.findFirst({
    where: { id, deletedAt: null },
    select: {
      status: true,
      expiresAt: true,
      sellerId: true,
      seller: { select: { bannedAt: true, profile: { select: { phone: true, phoneVerifiedAt: true } } } },
    },
  });
  const owner = row?.sellerId === auth.user.id || auth.user.role === "admin";
  if (!row || (!isLiveRow(row) && !owner) || row.seller.bannedAt) {
    return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  }
  const profile = row.seller.profile;
  const phone = profile?.phoneVerifiedAt && profile.phone ? profile.phone : "";
  if (!phone) return NextResponse.json({ ok: false, error: "seller.nophone" }, { status: 404 });
  return NextResponse.json({ ok: true, phone }, { headers: { "Cache-Control": "no-store" } });
}
