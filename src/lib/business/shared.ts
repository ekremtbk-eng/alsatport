import { categories, lookupCategory, type Category } from "@/data/categories";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";

export const COMPANY_TYPES = ["sahis", "limited", "anonim", "diger"] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const BUSINESS_STATUSES = ["pending", "approved", "rejected", "revoked"] as const;
export type BusinessStatusId = (typeof BUSINESS_STATUSES)[number];

/** Reserved for future paid store plans. No screen shows or sells a tier while every store is "free". */
export const BUSINESS_TIERS = ["free", "kurumsal_plus", "profesyonel", "vip_magaza"] as const;
export type BusinessTier = (typeof BUSINESS_TIERS)[number];

export const BUSINESS_DESC_MIN = 20;
export const BUSINESS_DESC_MAX = 2000;

/** Store categories are the top-level listing categories (no virtual filter shortcuts). */
export function businessCategories(): Category[] {
  return categories.filter((c) => !c.filter);
}

export function isBusinessCategory(id: string) {
  return businessCategories().some((c) => c.id === id);
}

export function businessCategoryName(id: string) {
  return lookupCategory(id)?.name ?? "";
}

export function isKnownCity(city: string) {
  return TURKEY_CITIES.some((c) => c.name === city);
}

export function isKnownDistrict(city: string, district: string) {
  return !district || districtsOf(city).includes(district);
}

const TR_FOLD: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" };

export function slugifyBusinessName(name: string) {
  const folded = name
    .trim()
    .replace(/[çğıİöşü]/g, (ch) => TR_FOLD[ch] ?? ch)
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const slug = folded
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "magaza";
}

/** National 10-digit number (landline, mobile or 0850) or null. */
export function normalizeBusinessPhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("90")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[2-58]\d{9}$/.test(d) ? d : null;
}

export function formatBusinessPhone(national: string) {
  const d = national.replace(/\D/g, "");
  if (d.length !== 10) return national;
  return `0 (${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/** https URL with a real hostname, or "" for empty input, or null when invalid. */
export function normalizeWebsite(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (v.length > 200) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function isValidTaxNumber(value: string) {
  return /^\d{10,11}$/.test(value);
}

export type StoreRef = { slug: string; name: string; logo?: string };

/** Public store data only: never tax data, contact person or private contact details. */
export type PublicStore = {
  slug: string;
  name: string;
  categoryId: string;
  city: string;
  district: string;
  description: string;
  website?: string;
  logoUrl?: string;
  coverUrl?: string;
  approvedAt: number;
  memberSince: number;
  activeCount: number;
  soldCount: number;
};

export type OwnerStats = {
  active: number;
  expired: number;
  sold: number;
  views: number;
  favorites: number;
};

export type OwnerBusiness = {
  slug: string;
  status: BusinessStatusId;
  name: string;
  contactName: string;
  companyType: CompanyType;
  taxOffice: string;
  taxNumber: string;
  categoryId: string;
  city: string;
  district: string;
  description: string;
  website: string;
  email: string;
  phone: string;
  logoUrl: string;
  coverUrl: string;
  rejectReason: string;
  submittedAt: number;
  reviewedAt?: number;
  approvedAt?: number;
  stats?: OwnerStats;
};

export type AdminBusiness = OwnerBusiness & {
  id: string;
  userId: string;
  username: string;
  accountEmail: string;
  revokedAt?: number;
};
