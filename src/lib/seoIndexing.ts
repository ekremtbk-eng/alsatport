import type { Prisma } from "@prisma/client";
import { findCategory, flattenCategories, isServiceTreeCategory } from "@/data/categories";

/** Same markers the listing-lifecycle migration uses to recognise seeded demo listings. */
const DEMO_LISTING_NO_PREFIX = "APD-";
const DEMO_SELLER_EMAIL_SUFFIX = "@demo.alsatport.com";

export function isDemoListingRow(row: { listingNo: string; seller?: { email: string } | null }) {
  if (row.listingNo.startsWith(DEMO_LISTING_NO_PREFIX)) return true;
  return Boolean(row.seller?.email.toLowerCase().endsWith(DEMO_SELLER_EMAIL_SUFFIX));
}

export function nonDemoListingWhere(): Prisma.ListingWhereInput {
  return {
    NOT: [
      { listingNo: { startsWith: DEMO_LISTING_NO_PREFIX } },
      { seller: { email: { endsWith: DEMO_SELLER_EMAIL_SUFFIX, mode: "insensitive" } } },
    ],
  };
}

/**
 * Service listings are shown on the service-provider profile page, which is noindex because it
 * carries generated reviews; their /ilan URL only forwards there.
 */
export function isServiceCategoryId(categoryId: string) {
  return isServiceTreeCategory(findCategory(categoryId));
}

export function serviceCategoryIds() {
  return flattenCategories()
    .map((c) => c.id)
    .filter(isServiceCategoryId);
}
