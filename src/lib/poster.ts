import type { Listing } from "@/data/store";
import { estateDealFromCategoryId, schemaForCategoryId, type ListingSchema } from "@/data/listingSchema";

export type PosterDeal = "sale" | "rent";
export type PosterTemplate = "sale" | "rent" | "plain";
export type PosterSize = "a4p" | "a4l" | "a3p" | "a3l";
export type PosterFeature = { label: string; text: string };

export const POSTER_SIZES: Record<PosterSize, { w: number; h: number; paper: "A4" | "A3"; landscape: boolean }> = {
  a4p: { w: 210, h: 297, paper: "A4", landscape: false },
  a4l: { w: 297, h: 210, paper: "A4", landscape: true },
  a3p: { w: 297, h: 420, paper: "A3", landscape: false },
  a3l: { w: 420, h: 297, paper: "A3", landscape: true },
};

/** Families that can produce a poster, with the spec labels worth showing (in priority order). */
const POSTER_FEATURES: Partial<Record<ListingSchema["family"], string[]>> = {
  emlak: [
    "Oda",
    "m²",
    "Net m²",
    "Kat",
    "Isıtma",
    "Balkon",
    "Asansör",
    "Otopark",
    "Eşyalı",
    "Site içerisinde",
    "İmar durumu",
    "Banyo",
    "Bina yaşı",
  ],
};

const YES = new Set(["var", "evet", "eşyalı", "yarı eşyalı"]);
const NO = new Set(["yok", "hayır", "eşyasız", "-", ""]);
const AFFIRMATIVE: Record<string, string> = {
  Balkon: "Balkonlu",
  Asansör: "Asansörlü",
  Otopark: "Otoparklı",
  "Site içerisinde": "Site İçinde",
  Eşyalı: "Eşyalı",
};

export function posterSupported(listing: Pick<Listing, "categoryId">) {
  return !!POSTER_FEATURES[schemaForCategoryId(listing.categoryId).family];
}

function specValue(listing: Listing, label: string) {
  return listing.specs?.find((s) => s.label === label)?.value?.trim() ?? "";
}

/** Sale/rent comes from the category tree first, then the listing's own "İlan tipi" spec. */
export function posterDeal(listing: Listing): { deal: PosterDeal | null; period: "month" | "day" | null } {
  const raw = (estateDealFromCategoryId(listing.categoryId) ?? specValue(listing, "İlan tipi")).toLocaleLowerCase("tr-TR");
  if (raw.includes("kiralık")) return { deal: "rent", period: raw.includes("günlük") ? "day" : "month" };
  if (raw.includes("satılık")) return { deal: "sale", period: null };
  return { deal: null, period: null };
}

function formatFeature(label: string, value: string): string | null {
  const v = value.trim();
  const lower = v.toLocaleLowerCase("tr-TR");
  if (NO.has(lower)) return null;
  if (YES.has(lower)) return AFFIRMATIVE[label] ?? label;
  if (label === "m²" || label === "Net m²") return /m²$/.test(v) ? v : `${v} m²`;
  if (label === "Kat") return /^-?\d+$/.test(v) ? `${v}. Kat` : /kat/i.test(v) ? v : `${v} Kat`;
  if (label === "Balkon") return lower === "teras" ? "Teraslı" : `${v} Balkon`;
  if (label === "Otopark") return /otopark/i.test(v) ? v : `Otopark: ${v}`;
  if (label === "Banyo") return /^\d+\+?$/.test(v) ? `${v} Banyo` : v;
  if (label === "Bina yaşı") return /^\d+$/.test(v) ? `${v} Yaşında` : v;
  return v;
}

export function posterFeatures(listing: Listing, max = 5): PosterFeature[] {
  const labels = POSTER_FEATURES[schemaForCategoryId(listing.categoryId).family] ?? [];
  const out: PosterFeature[] = [];
  for (const label of labels) {
    if (label === "Net m²" && out.some((f) => f.label === "m²")) continue;
    const text = formatFeature(label, specValue(listing, label));
    if (text) out.push({ label, text });
    if (out.length >= max) break;
  }
  return out;
}

export function posterPrice(price: number, period: "month" | "day" | null) {
  const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(price);
  return period === "month" ? `${money} / Ay` : period === "day" ? `${money} / Gün` : money;
}

export function posterPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const national = digits.startsWith("90") && digits.length === 12 ? `0${digits.slice(2)}` : digits;
  if (/^0\d{10}$/.test(national)) {
    return `${national.slice(0, 4)} ${national.slice(4, 7)} ${national.slice(7, 9)} ${national.slice(9)}`;
  }
  return phone.trim();
}

export function defaultPosterTemplate(deal: PosterDeal | null): PosterTemplate {
  return deal ?? "plain";
}

/** A deal template is only offered when it matches the listing's real deal type. */
export function posterTemplateAllowed(template: PosterTemplate, deal: PosterDeal | null) {
  return template === "plain" || template === deal;
}

export function posterPageCss(size: PosterSize) {
  const s = POSTER_SIZES[size];
  return `@page { size: ${s.w}mm ${s.h}mm; margin: 0; }`;
}
