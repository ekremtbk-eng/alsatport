import rawPlaces from "../../../data/tr-neighborhoods.json";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";

/**
 * Neighborhood names come from bertugfahriozer/il_ilce_mahalle (İçişleri / TÜİK derived lists).
 * Provinces and districts stay on the names already used by listings (`TURKEY_CITIES`).
 * A district with no matching list returns nothing. Names are never invented.
 * "Merkez" in the product list is the dataset key "{İL}-İL MERKEZİ".
 */

type RawPlaces = Record<string, Record<string, string[]>>;

const raw = rawPlaces as RawPlaces;

function fold(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

const byCity = new Map<string, { cityKey: string; districts: Map<string, string> }>();
for (const [cityKey, districts] of Object.entries(raw)) {
  const districtKeys = new Map<string, string>();
  for (const name of Object.keys(districts)) districtKeys.set(fold(name), name);
  byCity.set(fold(cityKey), { cityKey, districts: districtKeys });
}

function datasetDistrictKey(city: string, district: string) {
  const cityHit = byCity.get(fold(city));
  if (!cityHit) return null;
  const direct = cityHit.districts.get(fold(district));
  if (direct) return { cityKey: cityHit.cityKey, districtKey: direct };
  if (fold(district) === "merkez") {
    const merkez = cityHit.districts.get(`${fold(city)}-il merkezi`);
    if (merkez) return { cityKey: cityHit.cityKey, districtKey: merkez };
  }
  return null;
}

export function neighborhoodsOf(city: string, district: string): string[] {
  const official = TURKEY_CITIES.find((item) => item.name === city);
  if (!official || !official.districts.includes(district)) return [];
  const hit = datasetDistrictKey(city, district);
  if (!hit) return [];
  const list = raw[hit.cityKey]?.[hit.districtKey] ?? [];
  return [...new Set(list.map((name) => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
}

/** Canonical il / ilçe / mahalle, or null when the triple is not in the official lists. */
export function resolveMemberPlace(city: string, district: string, neighborhood: string) {
  const cityName = TURKEY_CITIES.find((item) => item.name === city.trim())?.name;
  if (!cityName) return null;
  const districtName = districtsOf(cityName).find((item) => item === district.trim());
  if (!districtName) return null;
  const hood = neighborhoodsOf(cityName, districtName).find(
    (item) => item === neighborhood.trim() || fold(item) === fold(neighborhood),
  );
  if (!hood) return null;
  return { city: cityName, district: districtName, neighborhood: hood };
}

export function turkeyPlaceCoverage() {
  let districts = 0;
  let matched = 0;
  const missing: string[] = [];
  for (const city of TURKEY_CITIES) {
    for (const district of city.districts) {
      districts += 1;
      if (neighborhoodsOf(city.name, district).length) matched += 1;
      else missing.push(`${city.name}/${district}`);
    }
  }
  return { cities: TURKEY_CITIES.length, districts, matched, missing };
}
