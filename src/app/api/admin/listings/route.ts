import { ListingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/security/session";
import { toClientListing } from "@/lib/listings/store";
import { isLiveRow, liveListingWhere } from "@/lib/listings/lifecycle";

const STATUSES = new Set<string>(Object.values(ListingStatus));

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const status = new URL(req.url).searchParams.get("status") || "pending";
  const rows = await prisma.listing.findMany({
    where: {
      deletedAt: null,
      ...(status === "all"
        ? {}
        : status === "expired"
          ? { OR: [{ status: "expired" }, { status: "active", expiresAt: { lte: new Date() } }] }
          : status === "active"
            ? liveListingWhere()
            : { status: (STATUSES.has(status) ? status : "pending") as ListingStatus }),
    },
    include: {
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      seller: { include: { profile: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return NextResponse.json({
    ok: true,
    listings: rows.map((r) => ({
      ...toClientListing(r),
      moderationStatus: r.status === "active" && !isLiveRow(r) ? "expired" : r.status,
    })),
  });
}
