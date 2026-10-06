import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/security/session";

export async function GET(req: Request) {
  const auth = await requireUser("admin");
  if ("error" in auth) return auth.error;
  const status = new URL(req.url).searchParams.get("status");
  const rows = await prisma.report.findMany({
    where: status ? { status: status as "open" } : { status: { in: ["open", "reviewing"] } },
    include: {
      reporter: { include: { profile: true } },
      listing: {
        select: {
          id: true,
          title: true,
          status: true,
          sellerId: true,
          seller: { select: { username: true, bannedAt: true, role: true, profile: { select: { displayName: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return NextResponse.json({
    ok: true,
    reports: rows.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      reason: r.reason,
      details: r.details,
      status: r.status,
      listingId: r.listingId,
      listingTitle: r.listing?.title,
      listingStatus: r.listing?.status,
      sellerId: r.listing?.sellerId ?? null,
      sellerName: r.listing ? r.listing.seller.profile?.displayName || r.listing.seller.username : null,
      sellerBanned: !!r.listing?.seller.bannedAt,
      sellerIsAdmin: r.listing?.seller.role === "admin",
      reporter: r.reporter.profile?.displayName || r.reporter.username,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
