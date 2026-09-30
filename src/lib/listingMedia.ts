import type { Listing } from "@/data/store";

/** Unsplash photo ids that currently 404 and render as a file-icon placeholder. */
const DEAD_UNSPLASH_IDS = new Set([
  "photo-1606668716725-2f2fcbac5c0e",
  "photo-1606662187344-141010dac1f5",
  "photo-1489824904134-933ca126628d",
  "photo-1621007947382-bb3c0433ba3b",
  "photo-1617531657520-4780c29d4b26",
  "photo-1502877333056-fc4dd5c9bb3d",
  "photo-1558981403-ab47d4f5edc5",
  "photo-1449424615650-94732968e576",
  "photo-1500375597-2e619f38bf0b",
  "photo-1600585154340-0ef3d69989a4",
  "photo-1696446701796-daab144d1f1d",
  "photo-1510557880182-e3d36653ce8c",
  "photo-1580910051074-3eb694d68c71",
  "photo-1452780212940-6f5c0d16d359",
  "photo-1461896836934-ffe607ba6851",
  "photo-1415369625552-e269a7d9bb7f",
  "photo-1696446702185-d739a7588010",
]);

export function isAllowedListingImageUrl(src: string) {
  const u = src.trim();
  if (u.length < 8 || u.length > 2000) return false;
  if (u.startsWith("data:") || u.startsWith("blob:")) return false;
  if (u.startsWith("/api/media/listings/") || u.startsWith("/api/media/avatars/")) return !u.includes("..");
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isUsableListingImage(src?: string) {
  if (!src?.trim()) return false;
  if (src.startsWith("/api/media/")) return !src.includes("..");
  if (src.startsWith("blob:")) return false;
  if (!/^https?:\/\//i.test(src)) return false;
  const id = src.match(/images\.unsplash\.com\/(photo-[^/?#]+)/i)?.[1];
  if (id && DEAD_UNSPLASH_IDS.has(id)) return false;
  return true;
}

export function usableListingImages(listing: Pick<Listing, "images">) {
  return (listing.images ?? []).filter(isUsableListingImage);
}

export function listingHasCoverPhoto(listing: Pick<Listing, "images">) {
  return usableListingImages(listing).length > 0;
}
