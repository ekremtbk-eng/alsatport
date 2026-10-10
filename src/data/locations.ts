import { KKTC_DISTRICTS } from "./kktc";
import { TURKEY_CITIES } from "./turkey";

/**
 * Two-country location model. Listings keep the existing `city` / `district` / `neighborhood` columns:
 * for KKTC, `city` holds the ilçe (Lefkoşa, Gazimağusa…), `district` the settlement and `neighborhood` the mahalle.
 * The six KKTC ilçe names do not collide with any of Turkey's 81 provinces, so the country is derived from `city`
 * and every existing row keeps resolving to Türkiye.
 */
export type Country = "TR" | "KKTC";

export const COUNTRIES: { id: Country; label: string; short: string; urlValue: string }[] = [
  { id: "TR", label: "Türkiye", short: "Türkiye", urlValue: "tr" },
  { id: "KKTC", label: "Kuzey Kıbrıs Türk Cumhuriyeti", short: "KKTC", urlValue: "kktc" },
];

export const TURKEY_CITY_NAMES: string[] = TURKEY_CITIES.map((c) => c.name);
export const KKTC_REGION_NAMES: string[] = KKTC_DISTRICTS.map((d) => d.name);
const KKTC_SET = new Set(KKTC_REGION_NAMES);
const TR_SET = new Set(TURKEY_CITY_NAMES);

export function countryOfCity(city?: string | null): Country | undefined {
  if (!city) return undefined;
  if (KKTC_SET.has(city)) return "KKTC";
  if (TR_SET.has(city)) return "TR";
  return undefined;
}

export function isKktcCity(city?: string | null) {
  return Boolean(city && KKTC_SET.has(city));
}

/** Accepts `TR`, `tr`, `Türkiye`, `KKTC`, `kktc`; anything else means "all countries". */
export function parseCountry(value?: string | null): Country | undefined {
  const v = (value ?? "").trim().toLocaleLowerCase("tr");
  if (!v) return undefined;
  if (v === "tr" || v === "türkiye" || v === "turkiye") return "TR";
  if (v === "kktc" || v === "kuzey kıbrıs" || v === "kuzey kibris") return "KKTC";
  return undefined;
}

export function countryLabel(country: Country) {
  return COUNTRIES.find((c) => c.id === country)?.short ?? country;
}

/** Top-level region names (il for Türkiye, ilçe for KKTC); both countries when none is chosen. */
export function regionNamesFor(country?: Country): string[] {
  if (country === "TR") return TURKEY_CITY_NAMES;
  if (country === "KKTC") return KKTC_REGION_NAMES;
  return [...TURKEY_CITY_NAMES, ...KKTC_REGION_NAMES];
}

export function kktcSettlementsOf(region?: string): string[] {
  return KKTC_DISTRICTS.find((d) => d.name === region)?.settlements.map((s) => s.name) ?? [];
}

export function kktcNeighborhoodsOf(region?: string, settlement?: string): string[] {
  return KKTC_DISTRICTS.find((d) => d.name === region)?.settlements.find((s) => s.name === settlement)?.neighborhoods ?? [];
}

export function isKnownCity(city: string) {
  return TR_SET.has(city) || KKTC_SET.has(city);
}

/** Prisma `city` condition for a country filter; undefined when no country is chosen. */
export function cityWhereForCountry(country?: Country): { in: string[] } | { notIn: string[] } | undefined {
  if (country === "KKTC") return { in: KKTC_REGION_NAMES };
  if (country === "TR") return { notIn: KKTC_REGION_NAMES };
  return undefined;
}

/** Select values meaning "a whole country" in single location pickers (header / home search). */
export const COUNTRY_PICK = { TR: "@tr", KKTC: "@kktc" } as const;

/** Picker value from `city` / `ulke` query params. */
export function locationPickFromParams(sp: URLSearchParams) {
  const city = (sp.get("city") ?? "").trim();
  if (city) return city;
  const country = parseCountry(sp.get("ulke"));
  return country ? COUNTRY_PICK[country] : "";
}

/** Writes a picker value as `city=` or `ulke=`. */
export function applyLocationPick(params: URLSearchParams, value: string) {
  if (!value) return;
  if (value === COUNTRY_PICK.TR) params.set("ulke", "tr");
  else if (value === COUNTRY_PICK.KKTC) params.set("ulke", "kktc");
  else params.set("city", value);
}

/** "Girne · Alsancak · KKTC" for KKTC listings; Turkish places keep the existing "İl · İlçe" form. */
export function placeLabel(city?: string, district?: string, sep = " · ") {
  const parts = [city, district].filter(Boolean) as string[];
  if (isKktcCity(city)) parts.push("KKTC");
  return parts.join(sep);
}

/** Listing belongs to the country; unknown legacy cities count as Türkiye. */
export function cityInCountry(city: string | undefined, country?: Country) {
  if (!country) return true;
  const c = countryOfCity(city);
  return country === "KKTC" ? c === "KKTC" : c !== "KKTC";
}
