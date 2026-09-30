import "server-only";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/ids";

export async function listFavoriteIds(userId: string) {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { listingId: true },
  });
  return rows.map((r) => r.listingId);
}

export async function addFavorite(userId: string, listingId: string) {
  if (!isUuid(listingId)) return { error: "auth.err.required" as const, status: 400 };
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, deletedAt: null },
  });
  if (!listing) return { error: "auth.err.session" as const, status: 404 };
  await prisma.favorite.upsert({
    where: { userId_listingId: { userId, listingId } },
    create: { userId, listingId },
    update: {},
  });
  return { ok: true as const };
}

export async function removeFavorite(userId: string, listingId: string) {
  if (!isUuid(listingId)) return { error: "auth.err.required" as const, status: 400 };
  await prisma.favorite.deleteMany({ where: { userId, listingId } });
  return { ok: true as const };
}
