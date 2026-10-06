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

export type VehicleSegment = "auto" | "suv" | "ev" | "moto" | "van" | "ticari" | "deniz" | "atv";

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
  if (profile === "atv" || profile === "utv") return "atv";
  if (profile === "deniz") return "deniz";
  if (profile === "van" || profile === "caravan") return "van";
  if (profile === "ticari") return "ticari";
  if (profile === "suv") return "suv";
  if (profile === "ev") return "ev";
  return "auto";
}

export function catalogForSegment(segment: VehicleSegment = "auto"): VehicleBrand[] {
  if (CACHE[segment]) return CACHE[segment]!;
  let cat: VehicleBrand[];
  switch (segment) {
    case "suv":
      cat = subset(VEHICLE_BRANDS, (m) => m.bodies.some((b) => /suv|pickup|arazi/i.test(b)));
      break;
    case "ev":
      cat = mergeCatalogs(
        enhanceEv(subset(VEHICLE_BRANDS, (m) => m.engines.some((e) => /elektrik|kwh/i.test(e)))),
        enhanceEv(asCatalog(EV_EXTRA_CATALOG)),
      );
      break;
    case "moto":
      cat = asCatalog(MOTO_CATALOG);
      break;
    case "atv":
      cat = asCatalog(MOTO_CATALOG);
      break;
    case "van":
      cat = asCatalog(VAN_CATALOG);
      break;
    case "ticari":
      cat = asCatalog(TICARI_CATALOG);
      break;
    case "deniz":
      cat = asCatalog(DENIZ_CATALOG);
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
