import { rootOf, type Category } from "@/data/categories";
import {
  ESTATE_FILTER_GROUPS,
  fieldOffered,
  filterFieldsForCategory,
  hasAdvancedFilters,
  type FilterField,
  type FilterState,
} from "@/lib/categoryFilters";

/**
 * Phone/tablet filter layout per category: a short "quick" list first, everything else in labelled groups.
 * Every category uses an explicit layout from MOBILE_FILTER_LAYOUTS or one derived from its own fields:
 * advancedLayout for categories with the desktop estate/vehicle dialog, defaultLayout for the rest.
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

const LISTING_KEYS = ["kimden", "seller", "swap", "warranty", "shopOpts", "posted", "urgent", "hasPhoto", "hasVideo", "mappedOnly"];
const SEARCH_KEYS = ["keyword", "category"];

const VEHICLE_LAYOUT: MobileFilterLayout = {
  quick: ["brand", "model", "trim", "priceMin", "yearMin", "kmMin", "location"],
  groups: [
    { id: "vehicle", labelKey: "mf.g.vehicle", keys: ["engine", "body", "fuel", "gear", "bodyType", "engineSize", "power", "drive", "color"] },
    { id: "condition", labelKey: "mf.g.condition", keys: ["damage", "paint", "equip"] },
    { id: "listing", labelKey: "mf.g.listing", keys: ["kimden", "seller", "posted", "urgent", "mappedOnly"] },
    { id: "kktc", labelKey: "mf.g.kktc", keys: ["steering", "origin", "importStatus", "customs", "kktcReg", "plateType", "firstReg"] },
    { id: "search", labelKey: "mf.g.search", keys: SEARCH_KEYS },
  ],
};

const MOBILE_FILTER_LAYOUTS: Record<string, MobileFilterLayout> = {
  vasita: VEHICLE_LAYOUT,
  "vasita-otomobil": VEHICLE_LAYOUT,
};

/** The field that names "what" is listed (service, subject, species…); it leads the quick tab. */
const LEAD_KEYS = ["service", "subject", "jobType", "helpType", "species", "petProduct", "product", "brand", "model", "breed", "tractor"];
/** Numeric/condition fields worth a quick row right after the price. */
const SECOND_KEYS = ["yearMin", "kmMin", "hoursMin", "ageMin", "cond", "sector", "level", "place", "exp"];

/** Layout derived from the category's own fields, so no category gets filters it does not have. */
function defaultLayout(fields: FilterField[]): MobileFilterLayout {
  const has = new Set(fields.map((f) => f.key));
  const lead = LEAD_KEYS.filter((k) => has.has(k)).slice(0, 3);
  const second = SECOND_KEYS.filter((k) => has.has(k)).slice(0, 5 - lead.length);
  const quick = [...lead, ...(has.has("priceMin") ? ["priceMin"] : []), ...second, "location"];
  const taken = new Set([...quick, ...LISTING_KEYS, ...SEARCH_KEYS, ...Object.values(PSEUDO_ROW_KEYS).flat()]);
  const details: string[] = [];
  for (const f of fields) {
    if (taken.has(f.key) || details.includes(f.key) || (f.kind === "range" && f.key.endsWith("Max"))) continue;
    details.push(f.key);
  }
  return {
    quick,
    groups: [
      { id: "details", labelKey: "mf.g.details", keys: details },
      { id: "listing", labelKey: "mf.g.listing", keys: LISTING_KEYS },
      { id: "search", labelKey: "mf.g.search", keys: SEARCH_KEYS },
    ],
  };
}

const ESTATE_QUICK = ["priceMin", "rooms", "sqmMin", "homeType", "deal", "zoning", "age"];

/**
 * Categories with the advanced dialog: same groups and titles as the dialog (flt.grp.*), so the structure users
 * know stays; only the most used fields move to the quick tab.
 */
function advancedLayout(cat: Category, fields: FilterField[]): MobileFilterLayout {
  const has = new Set(fields.map((f) => f.key));
  const quick =
    rootOf(cat).id === "vasita"
      ? [...VEHICLE_LAYOUT.quick]
      : [...ESTATE_QUICK.filter((k) => has.has(k)).slice(0, 5), "location"];
  const taken = new Set([...quick, ...Object.values(PSEUDO_ROW_KEYS).flat()]);
  const groups: MobileFilterGroup[] = [];
  for (const g of ESTATE_FILTER_GROUPS) {
    const keys: string[] = [];
    for (const f of fields) {
      if (f.group !== g || taken.has(f.key) || keys.includes(f.key) || (f.kind === "range" && f.key.endsWith("Max"))) continue;
      keys.push(f.key);
    }
    if (g === "basic") keys.push("posted");
    if (g === "other") keys.push("mappedOnly", "keyword", "category");
    if (keys.length) groups.push({ id: g, labelKey: `flt.grp.${g}`, keys });
  }
  return { quick, groups };
}

const derived = new Map<string, MobileFilterLayout>();

export function mobileFilterLayout(cat?: Category | null): MobileFilterLayout | null {
  if (!cat) return null;
  const fixed = MOBILE_FILTER_LAYOUTS[cat.id];
  if (fixed) return fixed;
  let layout = derived.get(cat.id);
  if (!layout) {
    const fields = filterFieldsForCategory(cat);
    layout = hasAdvancedFilters(cat) ? advancedLayout(cat, fields) : defaultLayout(fields);
    derived.set(cat.id, layout);
  }
  return layout;
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
  if (rest.length) groups.push({ id: "_rest", labelKey: "mf.g.other", rows: rest });
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

/**
 * Short single-choice fields shown as a sideways chip strip on the quick tab (vehicles: fuel and gearbox).
 * They keep their row under "Tüm Filtreler"; both edit the same state.
 */
const QUICK_CHIPS: Record<string, string[]> = { vasita: ["fuel", "gear"] };

export function quickChipFields(cat: Category, fields: FilterField[], state: FilterState) {
  return (QUICK_CHIPS[rootOf(cat).id] ?? [])
    .map((k) => fields.find((f) => f.key === k))
    .filter((f): f is FilterField => Boolean(f && f.kind === "select" && f.options?.length && f.options.length <= 8 && fieldOffered(f, state)));
}

export function rowActive(row: MobileFilterRow, state: FilterState) {
  return rowStateKeys(row).some((k) => Boolean(state[k]));
}

/** Active rows in the whole panel, so the Filtrele badge matches the panel tabs (a price range counts once). */
export function countActiveRows(layout: MobileFilterLayout, fields: FilterField[], state: FilterState) {
  const { quick, groups } = resolveMobileLayout(layout, fields, state);
  return [...quick, ...groups.flatMap((g) => g.rows)].filter((r) => rowActive(r, state)).length;
}

/** Brands most searched in Turkey across vehicles and electronics; only those in the category's own list are shown. */
const POPULAR_BRANDS = [
  "Renault",
  "Fiat",
  "Volkswagen",
  "Toyota",
  "Ford",
  "Hyundai",
  "BMW",
  "Mercedes-Benz",
  "Honda",
  "Yamaha",
  "Apple",
  "Samsung",
  "Xiaomi",
  "Lenovo",
  "HP",
  "Asus",
];

export function popularOptions(key: string, options: string[]) {
  if (key !== "brand") return [];
  const offered = new Set(options);
  const hits = POPULAR_BRANDS.filter((b) => offered.has(b)).slice(0, 8);
  return hits.length >= 4 ? hits : [];
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

type Buckets = [string, string][];

/** Price presets by root category; amounts differ by orders of magnitude between cars, phones and services. */
const PRICE_BUCKETS: Record<string, Buckets> = {
  vasita: [
    ["", "250000"],
    ["250000", "500000"],
    ["500000", "1000000"],
    ["1000000", "2000000"],
    ["2000000", "3000000"],
    ["3000000", ""],
  ],
  machines: [
    ["", "250000"],
    ["250000", "500000"],
    ["500000", "1000000"],
    ["1000000", "2500000"],
    ["2500000", "5000000"],
    ["5000000", ""],
  ],
  services: [
    ["", "500"],
    ["500", "1000"],
    ["1000", "2500"],
    ["2500", "5000"],
    ["5000", "10000"],
    ["10000", ""],
  ],
  jobs: [
    ["", "25000"],
    ["25000", "35000"],
    ["35000", "50000"],
    ["50000", "75000"],
    ["75000", ""],
  ],
  default: [
    ["", "1000"],
    ["1000", "5000"],
    ["5000", "10000"],
    ["10000", "25000"],
    ["25000", "50000"],
    ["50000", ""],
  ],
};
const PRICE_ROOT: Record<string, string> = { tutors: "services", helpers: "services" };

/** Ready-made ranges for a range field in this category; [min, max] with "" for an open end. */
export function rangeBuckets(key: string, cat?: Category | null): Buckets {
  if (key === "priceMin") {
    const root = cat ? rootOf(cat).id : "";
    return PRICE_BUCKETS[PRICE_ROOT[root] ?? root] ?? PRICE_BUCKETS.default;
  }
  return RANGE_BUCKETS[key] ?? [];
}

const RANGE_BUCKETS: Record<string, Buckets> = {
  hoursMin: [
    ["", "1000"],
    ["", "3000"],
    ["", "5000"],
    ["", "10000"],
    ["10000", ""],
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
