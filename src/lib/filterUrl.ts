import type { FilterField, FilterState } from "@/lib/categoryFilters";

const RESERVED = new Set(["q", "kategori", "cat", "filter", "next", "type", "edit"]);
const META = new Set(["sira", "gorunum", "sayfa"]);

const TO_URL: Record<string, string> = {
  brand: "marka",
  district: "ilce",
  neighborhood: "mahalle",
  fuel: "yakit",
  gear: "vites",
  trim: "seri",
};

const FROM_URL: Record<string, string> = {
  marka: "brand",
  ilce: "district",
  mahalle: "neighborhood",
  yakit: "fuel",
  vites: "gear",
  seri: "trim",
};

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const KEY_RE = /^[A-Za-z][A-Za-z0-9]{0,31}$/;

export function isSafeFilterKey(key: string) {
  return KEY_RE.test(key) && !UNSAFE_KEYS.has(key);
}

export function filtersFromSearchParams(params: URLSearchParams, extra?: FilterState): FilterState {
  const state: FilterState = { ...(extra ?? {}) };
  for (const [rawKey, value] of params.entries()) {
    if (!value || RESERVED.has(rawKey) || META.has(rawKey)) continue;
    const key = FROM_URL[rawKey] ?? rawKey;
    if (!isSafeFilterKey(key)) continue;
    state[key] = value;
  }
  return state;
}

/** Stable query string of only the filter params (no category, keyword or paging), for server-side filtering. */
export function filterQueryKey(params: URLSearchParams) {
  const pairs: [string, string][] = [];
  for (const [key, value] of params.entries()) {
    if (!value || RESERVED.has(key) || META.has(key)) continue;
    pairs.push([key, value]);
  }
  pairs.sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(pairs).toString();
}

const SERVER_STD_KEYS = new Set(["city", "district", "neighborhood", "posted", "keyword", "includeDesc", "seller", "urgent", "mappedOnly"]);

/** Filter state from untrusted query params, limited to the category's own fields with bounded values. */
export function serverFilterState(params: URLSearchParams, fields: FilterField[]): FilterState {
  const allowed = new Set(SERVER_STD_KEYS);
  const numeric = new Set<string>();
  const choices = new Map<string, Set<string>>();
  for (const f of fields) {
    allowed.add(f.key);
    if ((f.kind === "multi" || f.multiPick) && f.options?.length && !f.optionSource) choices.set(f.key, new Set(f.options));
    if (f.kind === "range") {
      numeric.add(f.key);
      if (f.pairKey) {
        allowed.add(f.pairKey);
        numeric.add(f.pairKey);
      }
    }
  }
  const state: FilterState = {};
  for (const [key, raw] of Object.entries(filtersFromSearchParams(params))) {
    if (!allowed.has(key) || !isSafeFilterKey(key)) continue;
    const opts = choices.get(key);
    const value = raw.trim().slice(0, opts ? 1200 : 200);
    if (!value) continue;
    if (numeric.has(key)) {
      if (/^\d{1,12}$/.test(value)) state[key] = value;
      continue;
    }
    if (opts) {
      const kept = [...new Set(value.split(",").map((v) => v.trim()))].filter((v) => opts.has(v)).slice(0, 40);
      if (kept.length) state[key] = kept.join(",");
      continue;
    }
    state[key] = value;
  }
  return state;
}

export function mergeFilterQuery(
  current: URLSearchParams,
  state: FilterState,
  extras?: { sira?: string; gorunum?: string; sayfa?: number },
) {
  const next = new URLSearchParams();
  for (const key of ["q", "kategori", "cat", "filter"] as const) {
    const value = current.get(key);
    if (value) next.set(key, value);
  }
  for (const [key, value] of Object.entries(state)) {
    if (!value || value === "all") continue;
    next.set(TO_URL[key] ?? key, value);
  }
  if (extras?.sira && extras.sira !== "onerilen") next.set("sira", extras.sira);
  if (extras?.gorunum && extras.gorunum !== "grid") next.set("gorunum", extras.gorunum);
  if (extras?.sayfa && extras.sayfa > 1) next.set("sayfa", String(extras.sayfa));
  return next.toString();
}

export function parseBrowseMeta(params: URLSearchParams): {
  sort: string;
  view: "grid" | "list";
  page: number;
} {
  const sira = params.get("sira");
  const sort = sira === "yeni" || sira === "ucuz" || sira === "pahali" || sira === "puan" ? sira : "onerilen";
  const view = params.get("gorunum") === "list" ? "list" : "grid";
  const page = Math.max(1, Number(params.get("sayfa") || "1") || 1);
  return { sort, view, page };
}
