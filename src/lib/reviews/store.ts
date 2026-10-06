import "server-only";
import type { SellerReview } from "@/data/reviews";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { sanitizeMultiline } from "@/lib/security/sanitize";
import { publicAccountName, verifiedBusinessName } from "@/lib/publicName";

function toClient(row: {
  id: string;
  sellerId: string;
  listingId: string | null;
  authorId: string;
  rating: number;
  text: string;
  createdAt: Date;
  author: {
    username: string;
    profile: {
      displayName: string | null;
      avatarUrl: string | null;
      businessName: string | null;
      businessVerifiedAt: Date | null;
    } | null;
  };
}): SellerReview {
  return {
    id: row.id,
    sellerId: row.sellerId,
    listingId: row.listingId ?? undefined,
    authorId: row.authorId,
    authorName: publicAccountName({ ...row.author.profile, username: row.author.username }),
    authorBusiness: !!verifiedBusinessName(row.author.profile),
    authorAvatar: row.author.profile?.avatarUrl || "",
    rating: row.rating,
    text: row.text,
    createdAt: row.createdAt.toLocaleDateString("tr-TR"),
  };
}

export async function listSellerReviews(sellerId: string) {
  if (!isUuid(sellerId)) return [];
  const rows = await prisma.sellerReview.findMany({
    where: { sellerId },
    include: { author: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(toClient);
}

export async function upsertSellerReview(input: {
  sellerId: string;
  authorId: string;
  listingId?: string;
  rating: number;
  text: string;
}) {
  if (!isUuid(input.sellerId) || !isUuid(input.authorId)) {
    return { error: "auth.err.required" as const, status: 400 };
  }
  if (input.sellerId === input.authorId) {
    return { error: "rev.selfp" as const, status: 400 };
  }
  const text = sanitizeMultiline(input.text, 2000).trim();
  if (text.length < 12) return { error: "rev.short" as const, status: 400 };
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const listingId = input.listingId && isUuid(input.listingId) ? input.listingId : null;
  if (listingId) {
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, deletedAt: null },
      select: { sellerId: true },
    });
    if (!listing || listing.sellerId !== input.sellerId) {
      return { error: "auth.err.required" as const, status: 400 };
    }
  }
  const seller = await prisma.user.findFirst({ where: { id: input.sellerId, bannedAt: null } });
  if (!seller) return { error: "auth.err.session" as const, status: 404 };

  const row = await prisma.sellerReview.upsert({
    where: { sellerId_authorId: { sellerId: input.sellerId, authorId: input.authorId } },
    create: {
      sellerId: input.sellerId,
      authorId: input.authorId,
      listingId,
      rating,
      text,
    },
    update: { rating, text, listingId },
    include: { author: { include: { profile: true } } },
  });
  return { ok: true as const, review: toClient(row) };
}
