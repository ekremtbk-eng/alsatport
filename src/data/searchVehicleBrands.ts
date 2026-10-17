/**
 * Vehicle brand/model suggest helpers.
 * Heavy catalog stays out of Header/home: load slim search index via dynamic import().
 * Types are local so the index module has zero static importers.
 */
export type VehicleBrandSearchEntry = { name: string; models: string[] };

export function searchVehicleBrandLabels(query: string, brands: VehicleBrandSearchEntry[]): string[] {
  const q = query.trim().toLocaleLowerCase("tr");
  if (q.length < 2) return [];
  const hits: string[] = [];
  const seen = new Set<string>();
  const push = (label: string) => {
    const key = label.toLocaleLowerCase("tr");
    if (seen.has(key) || !label.toLocaleLowerCase("tr").includes(q)) return;
    seen.add(key);
    hits.push(label);
  };
  for (const brand of brands) {
    push(brand.name);
    for (const model of brand.models) {
      push(model);
      if (q.length >= 3 && model.toLocaleLowerCase("tr").includes(q)) {
        push(`${brand.name} ${model}`);
      }
    }
    if (hits.length >= 6) return hits;
  }
  return hits.slice(0, 6);
}

type IndexMod = typeof import("@/data/vehicleBrandSearchIndex");

let indexPromise: Promise<IndexMod> | null = null;

/** Start downloading the slim brand-search chunk (call on search focus / pointerdown). */
export function prefetchVehicleCatalog(): Promise<IndexMod> {
  if (!indexPromise) {
    indexPromise = import(
      /* webpackChunkName: "vehicle-brand-search" */
      /* webpackMode: "lazy" */
      "@/data/vehicleBrandSearchIndex"
    ).catch((err) => {
      indexPromise = null; // allow retry on next focus/type
      throw err;
    });
  }
  return indexPromise;
}

/**
 * Fire-and-forget prefetch for pointerdown/hover — never rejects to the UI.
 * Kept off the critical path so initial JS transfer stays unchanged.
 */
export function warmVehicleBrandSearch() {
  void prefetchVehicleCatalog().catch(() => {
    /* ignore — searchVehicleBrands fail-opens to [] */
  });
}

/** Search vehicle brands/models after ensuring the slim index chunk is loaded. */
export async function searchVehicleBrands(query: string): Promise<string[]> {
  try {
    const mod = await prefetchVehicleCatalog();
    return searchVehicleBrandLabels(query, mod.VEHICLE_BRAND_SEARCH_INDEX);
  } catch {
    return [];
  }
}

/** Merge category-node brand hits with vehicle hits (same cap/order as legacy searchBrands). */
export function mergeBrandHits(categoryHits: string[], vehicleHits: string[], limit = 6): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const label of [...categoryHits, ...vehicleHits]) {
    const key = label.toLocaleLowerCase("tr");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}
