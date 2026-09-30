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

export function isPublicListing(listing: Listing) {
  return isActiveListing(listing) && !isBlockedLiveAnimalListing(listing) && listingHasCoverPhoto(listing);
}

export function buildLiveCategoryCounts(listings: Listing[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const c of allCategoryNodes()) map[c.id] = 0;

  const active = listings.filter(isPublicListing);
  for (const listing of active) {
    const cat = findCategory(listing.categoryId);
    if (!cat) {
      map[listing.categoryId] = (map[listing.categoryId] ?? 0) + 1;
      continue;
    }
    const seen = new Set<string>();
    let node: Category | undefined = cat;
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      map[node.id] = (map[node.id] ?? 0) + 1;
      node = parentOf(node);
    }
  }

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
