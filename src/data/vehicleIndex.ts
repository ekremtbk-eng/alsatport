import type { VehicleBrand, VehicleModelLine } from "./vehicleCatalog";
import { VEHICLE_BRANDS } from "./vehicleCatalog";
import {
  DENIZ_CATALOG,
  EV_EXTRA_CATALOG,
  MOTO_CATALOG,
  TICARI_CATALOG,
  VAN_CATALOG,
  type FleetBrand,
} from "./vehicleFleets";
import { AIR_CATALOG, ATV_CATALOG, CARAVAN_CATALOG, MOTO_EXTRA_CATALOG, UTV_CATALOG } from "./vehicleFleetsExtra";

export type VehicleSegment =
  | "auto"
  | "suv"
  | "ev"
  | "moto"
  | "van"
  | "ticari"
  | "deniz"
  | "atv"
  | "utv"
  | "air"
  | "caravan"
  | "classic";

/** Controlled escape value for brands/models missing from a catalog (never offered for Otomobil). */
export const VEHICLE_OTHER = "Diğer";

export type VehicleProfile =
  | "auto"
  | "suv"
  | "ev"
  | "moto"
  | "atv"
  | "utv"
  | "van"
  | "ticari"
  | "rental"
  | "deniz"
  | "damaged"
  | "caravan"
  | "classic"
  | "air"
  | "disabled";


function unique(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    if (!key) continue;
    const norm = key.toLocaleLowerCase("tr");
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(key);
  }
  return out;
}

function asCatalog(fleets: FleetBrand[]): VehicleBrand[] {
  return fleets as unknown as VehicleBrand[];
}

function subset(catalog: VehicleBrand[], pred: (m: VehicleModelLine) => boolean): VehicleBrand[] {
  const out: VehicleBrand[] = [];
  for (const b of catalog) {
    const models = b.models.filter(pred);
    if (!models.length) continue;
    out.push({
      name: b.name,
      models,
      series: models.map((m) => ({ name: m.name, models: m.packages })),
    });
  }
  return out;
}

function enhanceEv(catalog: VehicleBrand[]): VehicleBrand[] {
  return catalog.map((b) => ({
    ...b,
    models: b.models.map((m) => ({
      ...m,
      engines: unique(m.engines.filter((e) => /kwh|elektrik/i.test(e))).length
        ? unique(m.engines.filter((e) => /kwh|elektrik/i.test(e)))
        : unique(m.engines),
      ranges: m.ranges?.length ? unique(m.ranges) : [],
    })),
  }));
}

function mergeCatalogs(primary: VehicleBrand[], extra: VehicleBrand[]): VehicleBrand[] {
  const map = new Map<string, VehicleBrand>();
  for (const b of [...primary, ...extra]) {
    const key = b.name.toLocaleLowerCase("tr");
    const prev = map.get(key);
    if (!prev) {
      map.set(key, b);
      continue;
    }
    const names = new Set(prev.models.map((m) => m.name.toLocaleLowerCase("tr")));
    const models = [...prev.models, ...b.models.filter((m) => !names.has(m.name.toLocaleLowerCase("tr")))];
    map.set(key, {
      name: prev.name,
      models,
      series: models.map((m) => ({ name: m.name, models: m.packages })),
    });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));
}

const CACHE: Partial<Record<VehicleSegment, VehicleBrand[]>> = {};

function isVasitaScope(id?: string) {
  const s = (id ?? "").toLocaleLowerCase("tr");
  return (
    s === "auto" ||
    s === "vasita" ||
    s.startsWith("vasita-") ||
    s === "otomobil" ||
    s === "motosiklet" ||
    s === "elektrikli-araclar" ||
    s === "arazi-suv-pickup" ||
    s === "minivan-panelvan" ||
    s === "ticari-araclar" ||
    s === "kiralik-araclar" ||
    s === "deniz-araclari" ||
    s === "hasarli-araclar" ||
    s === "karavan" ||
    s === "klasik-araclar" ||
    s === "hava-araclari" ||
    s === "atv" ||
    s === "utv" ||
    s === "engelli-plakali-araclar"
  );
}

export function vehicleProfileFromCategoryId(id?: string): VehicleProfile {
  const s = (id ?? "").toLocaleLowerCase("tr");
  if (s.includes("vasita-utv") || s === "utv") return "utv";
  if (s.includes("vasita-atv") || s === "atv") return "atv";
  if (s.includes("hava")) return "air";
  if (s.includes("karavan")) return "caravan";
  if (s.includes("klasik")) return "classic";
  if (s.includes("engelli")) return "disabled";
  if (s.includes("hasarli")) return "damaged";
  if (s.includes("kiralik")) return "rental";
  if (s.includes("moto")) return "moto";
  if (s.includes("deniz")) return "deniz";
  if (s.includes("van") || s.includes("panelvan") || s.includes("minivan")) return "van";
  if (s.includes("ticari")) return "ticari";
  if (s.includes("suv") || s.includes("arazi") || s.includes("pickup")) return "suv";
  if (s.includes("vasita-ev") || s.includes("elektrikli-arac")) return "ev";
  return "auto";
}

export function vehicleSegmentFromCategoryId(id?: string): VehicleSegment {
  const s = (id ?? "").toLocaleLowerCase("tr");
  if (!isVasitaScope(s)) return "auto";
  const profile = vehicleProfileFromCategoryId(id);
  if (profile === "moto") return "moto";
  if (profile === "atv") return "atv";
  if (profile === "utv") return "utv";
  if (profile === "air") return "air";
  if (profile === "deniz") return "deniz";
  if (profile === "caravan") return "caravan";
  if (profile === "classic") return "classic";
  if (profile === "van") return "van";
  if (profile === "ticari") return "ticari";
  if (profile === "suv") return "suv";
  if (profile === "ev") return "ev";
  return "auto";
}

/** Appends the controlled "Diğer" model to every brand and a "Diğer" brand; packages stay empty for both. */
function withOther(catalog: VehicleBrand[]): VehicleBrand[] {
  const other = { name: VEHICLE_OTHER, packages: [], engines: [], bodies: [], ranges: [] } as VehicleModelLine;
  const brands = catalog.map((b) => {
    if (b.models.some((m) => m.name === VEHICLE_OTHER)) return b;
    const models = [...b.models, other];
    return { ...b, models, series: models.map((m) => ({ name: m.name, models: m.packages })) };
  });
  brands.push({ name: VEHICLE_OTHER, models: [other], series: [{ name: VEHICLE_OTHER, models: [] }] });
  return brands;
}

export function catalogForSegment(segment: VehicleSegment = "auto"): VehicleBrand[] {
  if (CACHE[segment]) return CACHE[segment]!;
  let cat: VehicleBrand[];
  switch (segment) {
    case "suv":
      cat = withOther(subset(VEHICLE_BRANDS, (m) => m.bodies.some((b) => /suv|pickup|arazi/i.test(b))));
      break;
    case "ev":
      cat = withOther(
        mergeCatalogs(
          enhanceEv(subset(VEHICLE_BRANDS, (m) => m.engines.some((e) => /elektrik|kwh/i.test(e)))),
          enhanceEv(asCatalog(EV_EXTRA_CATALOG)),
        ),
      );
      break;
    case "moto":
      cat = withOther(mergeCatalogs(asCatalog(MOTO_CATALOG), asCatalog(MOTO_EXTRA_CATALOG)));
      break;
    case "atv":
      cat = withOther(asCatalog(ATV_CATALOG));
      break;
    case "utv":
      cat = withOther(asCatalog(UTV_CATALOG));
      break;
    case "air":
      cat = withOther(asCatalog(AIR_CATALOG));
      break;
    case "caravan":
      cat = withOther(asCatalog(CARAVAN_CATALOG));
      break;
    case "classic":
      cat = withOther(VEHICLE_BRANDS);
      break;
    case "van":
      cat = withOther(asCatalog(VAN_CATALOG));
      break;
    case "ticari":
      cat = withOther(mergeCatalogs(asCatalog(TICARI_CATALOG), asCatalog(VAN_CATALOG)));
      break;
    case "deniz":
      cat = withOther(asCatalog(DENIZ_CATALOG));
      break;
    default:
      cat = VEHICLE_BRANDS;
  }
  CACHE[segment] = cat;
  return cat;
}

export function brandNamesForSegment(segment: VehicleSegment = "auto"): string[] {
  return catalogForSegment(segment).map((b) => b.name);
}

function findBrand(brandName?: string, segment: VehicleSegment = "auto") {
  if (!brandName) return undefined;
  const key = brandName.toLocaleLowerCase("tr");
  return catalogForSegment(segment).find((b) => b.name.toLocaleLowerCase("tr") === key);
}

function findLine(brandName?: string, modelName?: string, segment: VehicleSegment = "auto") {
  if (!modelName) return undefined;
  const key = modelName.toLocaleLowerCase("tr");
  return findBrand(brandName, segment)?.models.find((m) => m.name.toLocaleLowerCase("tr") === key);
}

export function modelsOfBrand(brandName?: string, segment: VehicleSegment = "auto") {
  return findBrand(brandName, segment)?.models.map((m) => m.name) ?? [];
}

export function packagesOfModel(brandName?: string, modelName?: string, segment: VehicleSegment = "auto") {
  if (!modelName) return [];
  return findLine(brandName, modelName, segment)?.packages ?? [];
}

export function enginesOfModel(brandName?: string, modelName?: string, segment: VehicleSegment = "auto") {
  if (!modelName) return [];
  return findLine(brandName, modelName, segment)?.engines ?? [];
}

export function bodiesOfModel(brandName?: string, modelName?: string, segment: VehicleSegment = "auto") {
  if (!modelName) return [];
  return findLine(brandName, modelName, segment)?.bodies ?? [];
}

export function rangesOfModel(brandName?: string, modelName?: string, segment: VehicleSegment = "auto") {
  if (!modelName) return [];
  return findLine(brandName, modelName, segment)?.ranges ?? [];
}

/**
 * Server-side cascade check for a submitted vehicle: a catalog brand only accepts its own models, and a model with
 * listed packages only accepts those. Values outside the catalog brand list are left to the caller (old listings).
 */
export function vehicleComboError(
  segment: VehicleSegment,
  input: { brand?: string; model?: string; trim?: string },
): "model" | "trim" | null {
  const b = findBrand(input.brand, segment);
  if (!b) return null;
  if (input.model) {
    const line = findLine(input.brand, input.model, segment);
    if (!line) return "model";
    if (input.trim && line.packages.length && !line.packages.some((p) => p.toLocaleLowerCase("tr") === input.trim!.toLocaleLowerCase("tr"))) {
      return "trim";
    }
  }
  return null;
}

export function seriesOfBrand(brandName?: string, segment: VehicleSegment = "auto") {
  return modelsOfBrand(brandName, segment);
}

export function modelsOfSeries(brandName?: string, seriesName?: string, segment: VehicleSegment = "auto") {
  return packagesOfModel(brandName, seriesName, segment);
}

/**
 * Per trim-level equipment is not stored in the static vehicle catalog.
 * Returns null so callers never guess ABS/ESP/etc. from brand/model alone.
 */
export function equipmentForVehicleCombo(_input: {
  brand?: string;
  model?: string;
  trim?: string;
  engine?: string;
  body?: string;
  year?: string;
  segment?: VehicleSegment;
}): string[] | null {
  return null;
}
