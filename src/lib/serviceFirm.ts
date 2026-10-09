import {
  findCategory,
  hrefForRenoCategory,
  isServiceTreeCategory,
  parentOf,
  serviceHubOf,
  type Category,
} from "@/data/categories";
import type { SellerReview } from "@/data/reviews";
import { summarizeReviews } from "@/data/reviews";
import type { Listing } from "@/data/store";
import { isFirmOpen, type FirmHours, type PublicFirm } from "@/lib/business/firmProfile";

export const SERVICE_FIRM_PATH = "/ustalar-hizmetler/firma";

export function serviceFirmHref(listingId: string) {
  return `${SERVICE_FIRM_PATH}/${encodeURIComponent(listingId)}`;
}

export type FirmPriceRow = { title: string; unit?: string; min: number; max?: number };
export type FirmQa = { q: string; a: string };
export type FirmCheck = { label: string };
export type FirmDetail = { label: string; value: string };

/**
 * Everything on a service provider page comes from what the seller entered (listing form, business
 * panel) or from the database; a section without data is empty and hidden, never filled in.
 */
export type FirmProfile = {
  hours24: boolean;
  /** null: the seller entered no opening hours, so open/closed is unknown and not shown. */
  open: boolean | null;
  hours: FirmHours | null;
  /** Free-form working pattern chosen in the listing form (e.g. "Mesai (09–18)"). */
  hoursNote: string;
  about: string;
  category: { name: string; href: string } | null;
  details: FirmDetail[];
  features: string[];
  districts: string[];
  prices: FirmPriceRow[];
  announcements: { text: string; at: number }[];
  qa: FirmQa[];
  checks: FirmCheck[];
  crumbs: { label: string; href: string }[];
  rating: { avg: number; count: number };
  gallery: string[];
};

/** Fields of the business application an admin reviews before approval (tax number is checksum-validated). */
const BUSINESS_REVIEWED_FIELDS: FirmCheck[] = [
  { label: "Ticari Ünvanı" },
  { label: "Yetkili Adı Soyadı" },
  { label: "Vergi Dairesi" },
  { label: "Vergi Numarası" },
];

const HOURS_SPEC = "Çalışma";

function ancestors(cat: Category) {
  const chain: Category[] = [];
  let cur: Category | undefined = cat;
  while (cur && cur.id !== "services") {
    chain.unshift(cur);
    cur = parentOf(cur);
  }
  return chain;
}

/** Only real reviews count; a firm without reviews has { avg: 0, count: 0 }. */
export function serviceRating(_listing: Listing, reviews: SellerReview[]) {
  const { avg, count } = summarizeReviews(reviews);
  return { avg, count };
}

export function buildFirmProfile(
  listing: Listing,
  reviews: SellerReview[],
  firm: PublicFirm | null = null,
  now = new Date(),
): FirmProfile {
  const cat = findCategory(listing.categoryId);
  const hub = cat ? serviceHubOf(cat) : undefined;
  const specs = (listing.specs ?? []).filter((s) => s.label?.trim() && s.value?.trim());
  const features = (listing.features ?? []).filter((f) => f.trim());
  const hoursNote = specs.find((s) => s.label === HOURS_SPEC)?.value ?? "";
  const hours = firm?.hours ?? null;
  const hours24 =
    hours?.always === true ||
    hoursNote === "7/24" ||
    features.some((f) => f.includes("7/24") || f.toLocaleLowerCase("tr").includes("24/7"));

  const crumbs: { label: string; href: string }[] = [{ label: "Hizmetler", href: "/kategoriler/ustalar-hizmetler" }];
  for (const node of cat ? ancestors(cat) : []) {
    crumbs.push({
      label: node.name,
      href: node.id === hub?.id ? `/kategoriler/${node.slug}` : hrefForRenoCategory(node),
    });
  }
  crumbs.push({ label: listing.title, href: serviceFirmHref(listing.id) });

  const prices: FirmPriceRow[] = firm?.priceList.length
    ? firm.priceList
    : listing.price > 0
      ? [{ title: listing.title, min: listing.price }]
      : [];

  const gallery = listing.images.filter(Boolean);

  return {
    hours24,
    open: isFirmOpen(hours, now),
    hours,
    hoursNote: hours ? "" : hoursNote,
    about: (firm?.description || listing.description || "").trim(),
    category: cat ? { name: cat.name, href: hrefForRenoCategory(cat) } : null,
    details: specs.filter((s) => s.label !== HOURS_SPEC || !hours),
    features,
    districts: firm?.serviceDistricts ?? [],
    prices,
    announcements: firm?.announcements ?? [],
    qa: firm?.faq ?? [],
    checks: listing.sellerBusiness ? BUSINESS_REVIEWED_FIELDS : [],
    crumbs,
    rating: serviceRating(listing, reviews),
    gallery: gallery.length ? gallery : [listing.sellerAvatar].filter(Boolean),
  };
}

export function isServiceListing(listing: { categoryId: string } | null | undefined) {
  if (!listing) return false;
  return isServiceTreeCategory(findCategory(listing.categoryId));
}
