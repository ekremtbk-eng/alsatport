import {
  allCategoryNodes,
  categoryShortcuts,
  findCategory,
  parentOf,
  type Category,
} from "@/data/categories";
import type { Listing } from "@/data/store";
import { listingMatchesFilter } from "@/lib/listingQuery";
import { listingHasCoverPhoto } from "@/lib/listingMedia";
import { isBlockedLiveAnimalListing } from "@/lib/liveAnimalPolicy";

export function isActiveListing(listing: Pick<Listing, "status">) {
  return listing.status === "active";
}

/** Mirrors server `isLiveRow` for client Listing shapes (`expiresAt` is epoch ms when set). */
export function isListingWithinPeriod(listing: Pick<Listing, "expiresAt">, now = Date.now()) {
  return !listing.expiresAt || listing.expiresAt > now;
}

/**
 * Public vitrine / search / favorites: active, not past expiresAt, cover photo, not blocked live-animal.
 * Aligns with `publicCountWhere` + `isLiveRow` (status/period) and cover-photo gate.
 */
export function isPublicListing(listing: Listing, now = Date.now()) {
  return (
    isActiveListing(listing) &&
    isListingWithinPeriod(listing, now) &&
    !isBlockedLiveAnimalListing(listing) &&
    listingHasCoverPhoto(listing)
  );
}

/**
 * Turns per-category listing totals into tree counts: each listing counts for its own category and every
 * ancestor, so a root ("Vasıta") equals the sum of its subcategories. Every known category starts at 0.
 */
export function rollupCategoryCounts(totals: Iterable<readonly [categoryId: string, n: number]>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of allCategoryNodes()) map[c.id] = 0;
  for (const [categoryId, n] of totals) {
    if (!(n > 0)) continue;
    const cat = findCategory(categoryId);
    if (!cat) {
      map[categoryId] = (map[categoryId] ?? 0) + n;
      continue;
    }
    const seen = new Set<string>();
    let node: Category | undefined = cat;
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      map[node.id] = (map[node.id] ?? 0) + n;
      node = parentOf(node);
    }
  }
  return map;
}

/** Shortcut entries ("Acil", "Son 48 saat"…) are listing filters, not tree nodes; counted from loaded listings. */
export function shortcutCounts(listings: Listing[]): Record<string, number> {
  const active = listings.filter(isPublicListing);
  const map: Record<string, number> = {};
  for (const shortcut of categoryShortcuts) {
    if (shortcut.filter) map[shortcut.id] = active.filter((l) => listingMatchesFilter(l, shortcut.filter)).length;
  }
  return map;
}

export function buildLiveCategoryCounts(listings: Listing[]): Record<string, number> {
  const active = listings.filter(isPublicListing);
  const map = rollupCategoryCounts(active.map((l) => [l.categoryId, 1] as const));

  for (const shortcut of categoryShortcuts) {
    if (!shortcut.filter) continue;
    map[shortcut.id] = active.filter((l) => listingMatchesFilter(l, shortcut.filter)).length;
  }

  return map;
}

export function liveCount(map: Record<string, number>, cat: Category | string) {
  const id = typeof cat === "string" ? cat : cat.id;
  return map[id] ?? 0;
}
