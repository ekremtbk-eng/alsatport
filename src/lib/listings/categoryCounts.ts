import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { rollupCategoryCounts } from "@/lib/categoryCounts";
import { liveListingWhere } from "@/lib/listings/lifecycle";
import { isBlockedLiveAnimalListing } from "@/lib/liveAnimalPolicy";

/** How long a computed count map is reused; new, removed, expired or sold listings show up within this window. */
export const CATEGORY_COUNTS_TTL_MS = 30_000;

/**
 * Publicly visible listings: active, not expired, not soft-deleted, with at least one photo
 * (pending, rejected, passive, sold, expired and removed rows have other statuses or are expired).
 */
export function publicCountWhere(now = new Date()): Prisma.ListingWhereInput {
  return { deletedAt: null, ...liveListingWhere(now), images: { some: {} } };
}

export type CategoryCounts = { counts: Record<string, number>; total: number; at: number };

const PETS_PREFIX = "pets";

/**
 * One GROUP BY over listings, rolled up to every category level. Hayvanlar Alemi rows are read separately
 * so the live-animal policy hides the same listings it hides from the public grid.
 */
export async function computeCategoryCounts(now = new Date()): Promise<CategoryCounts> {
  const where = publicCountWhere(now);
  const [rows, pets] = await Promise.all([
    prisma.listing.groupBy({
      by: ["categoryId"],
      where: { ...where, NOT: { categoryId: { startsWith: PETS_PREFIX } } },
      _count: { _all: true },
    }),
    prisma.listing.findMany({
      where: { ...where, categoryId: { startsWith: PETS_PREFIX } },
      select: { categoryId: true, title: true, subtitle: true, description: true, images: { select: { url: true } } },
    }),
  ]);
  const totals: (readonly [string, number])[] = rows.map((r) => [r.categoryId, r._count._all] as const);
  for (const p of pets) {
    const blocked = isBlockedLiveAnimalListing({ ...p, images: p.images.map((i) => i.url) });
    if (!blocked) totals.push([p.categoryId, 1]);
  }
  return {
    counts: rollupCategoryCounts(totals),
    total: totals.reduce((sum, [, n]) => sum + n, 0),
    at: now.getTime(),
  };
}

let cached: CategoryCounts | null = null;
let inflight: Promise<CategoryCounts> | null = null;

export async function getCategoryCounts(): Promise<CategoryCounts> {
  if (cached && Date.now() - cached.at < CATEGORY_COUNTS_TTL_MS) return cached;
  inflight ??= computeCategoryCounts()
    .then((value) => (cached = value))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Drop this instance's cached counts after a listing changes here. */
export function invalidateCategoryCounts() {
  cached = null;
}
