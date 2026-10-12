import type { Category } from "@/data/categories";
import { fieldOffered, type FilterField, type FilterState } from "@/lib/categoryFilters";

/**
 * Phone/tablet filter layout per category: a short "quick" list first, everything else in labelled groups.
 * Only categories listed in MOBILE_FILTER_LAYOUTS use the new panel; the rest keep FilterPanel unchanged.
 *
 * Keys are filter field keys (ranges by their Min key) plus these pseudo rows, which bundle several URL keys
 * or have no FilterField of their own.
 */
export const PSEUDO_ROWS = ["location", "posted", "mappedOnly", "keyword", "category"] as const;
export type PseudoRow = (typeof PSEUDO_ROWS)[number];

/** URL keys a pseudo row owns, so nothing is listed twice and nothing is lost. */
export const PSEUDO_ROW_KEYS: Record<PseudoRow, string[]> = {
  location: ["country", "city", "district", "neighborhood"],
  posted: ["posted"],
  mappedOnly: ["mappedOnly"],
  keyword: ["keyword", "includeDesc"],
  category: [],
};

export type MobileFilterGroup = { id: string; labelKey: string; keys: string[] };
export type MobileFilterLayout = { quick: string[]; groups: MobileFilterGroup[] };

const MOBILE_FILTER_LAYOUTS: Record<string, MobileFilterLayout> = {
  "vasita-otomobil": {
    quick: ["brand", "model", "priceMin", "yearMin", "kmMin", "location"],
    groups: [
      { id: "vehicle", labelKey: "mf.g.vehicle", keys: ["trim", "fuel", "gear", "bodyType", "engineSize", "power", "drive", "color"] },
      { id: "condition", labelKey: "mf.g.condition", keys: ["damage", "paint", "equip"] },
      { id: "listing", labelKey: "mf.g.listing", keys: ["kimden", "seller", "posted", "urgent", "mappedOnly"] },
      { id: "kktc", labelKey: "mf.g.kktc", keys: ["steering", "origin", "importStatus", "customs", "kktcReg", "plateType", "firstReg"] },
      { id: "search", labelKey: "mf.g.search", keys: ["keyword", "category"] },
    ],
  },
};

export function mobileFilterLayout(cat?: Category | null): MobileFilterLayout | null {
  return (cat && MOBILE_FILTER_LAYOUTS[cat.id]) || null;
}

export function isPseudoRow(key: string): key is PseudoRow {
  return (PSEUDO_ROWS as readonly string[]).includes(key);
}

/** A row in the panel: a pseudo row or the (Min side of a) filter field. */
export type MobileFilterRow = { key: string; field?: FilterField };

/** Field keys that never get a row of their own (owned by a pseudo row or the Max side of a range). */
function ownedKeys(fields: FilterField[]) {
  const owned = new Set<string>(Object.values(PSEUDO_ROW_KEYS).flat());
  for (const f of fields) if (f.kind === "range" && f.pairKey && f.key.endsWith("Max")) owned.add(f.key);
  return owned;
}

function toRow(key: string, fields: FilterField[], state: FilterState): MobileFilterRow | null {
  if (isPseudoRow(key)) return { key };
  const field = fields.find((f) => f.key === key);
  if (!field || !fieldOffered(field, state)) return null;
  return { key, field };
}

/**
 * Resolves a layout against the category's real fields: unknown keys are dropped, fields the layout forgot land
 * in an "other" group, and country-specific fields (KKTC) appear only while that country is selected.
 */
export function resolveMobileLayout(layout: MobileFilterLayout, fields: FilterField[], state: FilterState) {
  const placed = new Set<string>();
  const quick = layout.quick.map((k) => toRow(k, fields, state)).filter((r): r is MobileFilterRow => Boolean(r));
  quick.forEach((r) => placed.add(r.key));
  const groups = layout.groups
    .map((g) => {
      const rows = g.keys.map((k) => toRow(k, fields, state)).filter((r): r is MobileFilterRow => Boolean(r));
      rows.forEach((r) => placed.add(r.key));
      return { id: g.id, labelKey: g.labelKey, rows };
    })
    .filter((g) => g.rows.length > 0);
  const owned = ownedKeys(fields);
  const rest = fields
    .filter((f) => !placed.has(f.key) && !owned.has(f.key) && fieldOffered(f, state))
    .map((f) => ({ key: f.key, field: f }));
  if (rest.length) groups.push({ id: "other", labelKey: "mf.g.other", rows: rest });
  return { quick, groups };
}

/** Every URL key a set of rows controls; used for per-section counts and "clear this section". */
export function rowStateKeys(row: MobileFilterRow): string[] {
  if (isPseudoRow(row.key)) return row.key === "keyword" ? ["keyword"] : PSEUDO_ROW_KEYS[row.key];
  const f = row.field;
  if (!f) return [row.key];
  if (row.key === "priceMin") return ["priceMin", "priceMax", "currency"];
  return f.pairKey ? [f.key, f.pairKey] : [f.key];
}

export function rowActive(row: MobileFilterRow, state: FilterState) {
  return rowStateKeys(row).some((k) => Boolean(state[k]));
}

/** Number shown on a picker chip: Turkish "250 bin / 1,5 milyon", other locales use the compact form. */
export function compactAmount(n: number, locale: string) {
  if (locale === "tr") {
    if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} milyon`;
    if (n >= 1_000) return `${(n / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} bin`;
    return n.toLocaleString("tr-TR");
  }
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Ready-made ranges per range field; [min, max] with "" for an open end. */
export const RANGE_BUCKETS: Record<string, [string, string][]> = {
  priceMin: [
    ["", "250000"],
    ["250000", "500000"],
    ["500000", "1000000"],
    ["1000000", "2000000"],
    ["2000000", "3000000"],
    ["3000000", ""],
  ],
  yearMin: [
    ["2022", ""],
    ["2018", ""],
    ["2014", ""],
    ["2010", ""],
    ["2005", ""],
    ["", "2004"],
  ],
  kmMin: [
    ["", "25000"],
    ["", "50000"],
    ["", "100000"],
    ["", "150000"],
    ["", "200000"],
    ["200000", ""],
  ],
};
