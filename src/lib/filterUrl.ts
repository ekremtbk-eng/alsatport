import type { FilterState } from "@/lib/categoryFilters";

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

export function filtersFromSearchParams(params: URLSearchParams, extra?: FilterState): FilterState {
  const state: FilterState = { ...(extra ?? {}) };
  for (const [rawKey, value] of params.entries()) {
    if (!value || RESERVED.has(rawKey) || META.has(rawKey)) continue;
    const key = FROM_URL[rawKey] ?? rawKey;
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
