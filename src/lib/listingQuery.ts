import type { Listing } from "@/data/store";
import type { ListingFilter } from "@/data/categories";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function listingPostedAt(listing: Listing) {
  return listing.postedAt ?? Date.now() - 3 * DAY;
}

export function listingMatchesFilter(listing: Listing, filter?: ListingFilter | null) {
  if (!filter) return true;
  const age = Date.now() - listingPostedAt(listing);
  switch (filter) {
    case "urgent":
      return !!listing.urgent;
    case "h48":
      return age <= 48 * HOUR;
    case "w1":
      return age <= 7 * DAY;
    case "m1":
      return age <= 30 * DAY;
    case "refurbished":
      return !!listing.refurbished || listing.categoryId.includes("phone") || listing.categoryId === "phones";
    case "oto360":
    case "expertise":
      return listing.categoryId.startsWith("vasita") || listing.categoryId === "auto";
    case "emlak360":
    case "realtor":
      return listing.categoryId.startsWith("emlak") || listing.categoryId === "estate";
    case "picks":
      return listing.featured || listing.vip;
    case "legend":
      return listing.vip;
    case "odd":
      return listing.views < 20;
    case "story":
      return listing.sellerVerified;
    case "circular":
      return !!listing.refurbished;
    default:
      return true;
  }
}

export function listingMatchesTitleQuery(listing: Listing, query: string) {
  const needle = query.trim().toLocaleLowerCase("tr");
  if (!needle) return true;
  const blob = [listing.title, listing.subtitle, listing.city, listing.district]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr");
  return blob.includes(needle);
}

export function listingMatchesTextQuery(listing: Listing, query: string) {
  const needle = query.trim().toLocaleLowerCase("tr");
  if (!needle) return true;
  const blob = [
    listing.title,
    listing.subtitle,
    listing.city,
    listing.district,
    listing.description,
    listing.categoryId,
    ...listing.specs.map((s) => `${s.label} ${s.value}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr");
  return blob.includes(needle);
}

/** Acil paneli: "1" = 24 saat, "6h" = 6 saat, "Son 3 gün" = 72 saat. */
export function postedFilterHours(posted?: string) {
  const raw = (posted ?? "").trim();
  if (!raw) return 0;
  if (raw.endsWith("h")) return Number(raw.replace("h", "")) || 0;
  if (/^\d+$/.test(raw)) return Number(raw) * 24;
  if (raw === "Son 24 saat") return 24;
  if (raw === "Son 3 gün" || raw === "Son 3 gün içinde") return 72;
  if (raw === "Son 7 gün" || raw === "Son 7 gün içinde") return 168;
  if (raw === "Son 15 gün" || raw === "Son 15 gün içinde") return 360;
  if (raw === "Son 30 gün" || raw === "Son 30 gün içinde") return 720;
  return 0;
}

export function parseListingFilter(raw: string | null): ListingFilter | undefined {
  const allowed: ListingFilter[] = [
    "urgent",
    "h48",
    "w1",
    "m1",
    "refurbished",
    "oto360",
    "expertise",
    "emlak360",
    "realtor",
    "picks",
    "story",
    "legend",
    "odd",
    "circular",
  ];
  if (raw && allowed.includes(raw as ListingFilter)) return raw as ListingFilter;
  return undefined;
}
