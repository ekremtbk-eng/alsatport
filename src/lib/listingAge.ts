import type { Listing } from "@/data/store";
import { listingPostedAt } from "@/lib/listingQuery";

export function listingAgeLabel(listing: Listing, locale: string) {
  const ts = listingPostedAt(listing);
  const mins = Math.max(0, Math.floor((Date.now() - ts) / 60_000));
  const tr = locale.toLowerCase().startsWith("tr");
  if (mins < 2) return tr ? "Az önce" : "Just now";
  if (mins < 60) return tr ? `${mins} dakika önce` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return tr ? `${hours} saat önce` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return tr ? `${days} gün önce` : `${days}d ago`;
  return listing.createdAt || (tr ? `${days} gün önce` : `${days}d ago`);
}
