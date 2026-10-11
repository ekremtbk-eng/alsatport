import { YEARS } from "./listingOptions";
import type { VehicleSegment } from "./vehicleIndex";

/**
 * Extra vasıta details asked when the listing location is in KKTC. Every value is a seller declaration stored in
 * `specs` like any other attribute; nothing here is checked against an official registry.
 */
export type KktcVehicleField = {
  key: string;
  specLabel: string;
  options: string[];
  /** Not asked for two-wheelers. */
  carsOnly?: boolean;
};

export const STEERING_LEFT = "Sol direksiyon";
export const STEERING_RIGHT = "Sağ direksiyon";
export const DISTANCE_UNIT_LABEL = "Mesafe birimi";
export const DISTANCE_KM = "Km";
export const DISTANCE_MILE = "Mil";
export const KM_PER_MILE = 1.609344;

export const KKTC_VEHICLE_FIELDS: KktcVehicleField[] = [
  { key: "steering", specLabel: "Direksiyon", options: [STEERING_LEFT, STEERING_RIGHT], carsOnly: true },
  { key: "distUnit", specLabel: DISTANCE_UNIT_LABEL, options: [DISTANCE_KM, DISTANCE_MILE] },
  {
    key: "origin",
    specLabel: "Menşei",
    options: ["Japonya", "İngiltere", "Avrupa", "Türkiye", "Kore", "ABD", "Çin", "Diğer"],
  },
  {
    key: "importStatus",
    specLabel: "İthalat durumu",
    options: ["İkinci el ithal", "Sıfır ithal", "KKTC'de sıfır satın alındı", "Bilinmiyor"],
  },
  {
    key: "customs",
    specLabel: "Gümrük durumu",
    options: ["Gümrüğü ödenmiş", "Gümrük işlemleri sürüyor", "Bilinmiyor"],
  },
  {
    key: "kktcReg",
    specLabel: "KKTC kayıt durumu",
    options: ["KKTC'de kayıtlı", "Kayıt işlemleri sürüyor", "Kayıtlı değil"],
  },
  {
    key: "plateType",
    specLabel: "Plaka / kayıt türü",
    options: ["Özel plaka", "Ticari plaka", "Kiralık araç plakası", "Türkiye plakası", "Yabancı plaka", "Plakasız"],
  },
  { key: "firstReg", specLabel: "İlk tescil yılı", options: YEARS },
];

const ROAD_SEGMENTS = new Set<VehicleSegment>(["auto", "suv", "ev", "van", "ticari", "classic", "caravan", "moto"]);

export function kktcFieldsForSegment(segment: VehicleSegment): KktcVehicleField[] {
  if (!ROAD_SEGMENTS.has(segment)) return [];
  return KKTC_VEHICLE_FIELDS.filter((f) => !(f.carsOnly && segment === "moto"));
}

export const KKTC_FILTER_KEYS = KKTC_VEHICLE_FIELDS.map((f) => f.key);

export function declaresMiles(specs: { label: string; value: string }[] | undefined) {
  return Boolean(specs?.some((s) => s.label === DISTANCE_UNIT_LABEL && s.value === DISTANCE_MILE));
}

/** The "Km" spec holds the odometer as typed; when the seller declared miles, show it as miles with a km estimate. */
export function withDeclaredDistance<T extends { label: string; value: string }>(specs: T[]): T[] {
  if (!declaresMiles(specs)) return specs;
  return specs.map((s) => {
    if (s.label !== "Km") return s;
    const n = Number(String(s.value).replace(/\D/g, ""));
    if (!(n > 0)) return s;
    const km = Math.round(n * KM_PER_MILE);
    return { ...s, value: `${n.toLocaleString("tr-TR")} mil (≈ ${km.toLocaleString("tr-TR")} km)` };
  });
}

export function isRightHandDrive(specs: { label: string; value: string }[] | undefined) {
  return Boolean(specs?.some((s) => s.label === "Direksiyon" && s.value === STEERING_RIGHT));
}
