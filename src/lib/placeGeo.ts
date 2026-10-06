import { haversineKm } from "@/lib/geo";
import { DISTRICT_COORDS, keyOf } from "@/data/regionProfiles";
import { CITY_COORDS } from "@/data/cityCoords";
import type { NearbyItem, NearbyKind } from "@/lib/regionClient";

export type { NearbyItem, NearbyKind } from "@/lib/regionClient";
export type GeoPoint = { lat: number; lng: number; source: "listing" | "geocode" | "district" | "city" };

type CacheEntry<T> = { until: number; data: T };

const geoCache = new Map<string, CacheEntry<GeoPoint | null>>();
const geoInflight = new Map<string, Promise<GeoPoint | null>>();
const poiCache = new Map<string, CacheEntry<Record<NearbyKind, NearbyItem[]>>>();
const kindCache = new Map<string, CacheEntry<NearbyItem[]>>();
const overpassInflight = new Map<string, Promise<Record<NearbyKind, NearbyItem[]> | null>>();

const HOUR = 60 * 60 * 1000;
const GEO_TTL_MS = 7 * 24 * HOUR;
const POI_TTL_MS = 24 * HOUR;
const FAIL_TTL_MS = 5 * 60 * 1000;
const OVERPASS_COOLDOWN_MS = 5 * 60 * 1000;
const NOMINATIM_GAP_MS = 1100;
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINTS = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const UA = "AlsatPort/1.0 (https://alsatport.com; destek@alsatport.com)";
const MAX_KM_FROM_CITY = 150;
const MAX_POI_METERS = 5000;

let overpassDownUntil = 0;
let nominatimNextSlot = 0;

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function placeKey(city: string, district: string, neighborhood: string) {
  return [city, district, neighborhood].map((s) => norm(s).toLocaleLowerCase("tr")).join("|");
}

function readCache<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const hit = map.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.until) {
    map.delete(key);
    return undefined;
  }
  return hit.data;
}

function writeCache<T>(map: Map<string, CacheEntry<T>>, key: string, data: T, ttl: number) {
  map.set(key, { until: Date.now() + ttl, data });
}

function inTurkey(lat: number, lng: number) {
  return lat >= 35.8 && lat <= 42.4 && lng >= 25.6 && lng <= 45;
}

/** Nominatim usage policy: at most one request per second per application. */
async function nominatimSlot() {
  const now = Date.now();
  const at = Math.max(now, nominatimNextSlot);
  nominatimNextSlot = at + NOMINATIM_GAP_MS;
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}

async function nominatimSearch<T>(params: string): Promise<T[] | null> {
  await nominatimSlot();
  try {
    const res = await fetch(`${NOMINATIM}?format=jsonv2&countrycodes=tr&${params}`, {
      headers: { "User-Agent": UA, Accept: "application/json", "Accept-Language": "tr" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

export function validListingCoords(lat: unknown, lng: unknown, city: string): { lat: number; lng: number } | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inTurkey(lat, lng)) return null;
  const center = CITY_COORDS[norm(city)];
  if (center && haversineKm(center, { lat, lng }) > MAX_KM_FROM_CITY) return null;
  return { lat: Math.round(lat * 1e7) / 1e7, lng: Math.round(lng * 1e7) / 1e7 };
}

export function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  return Math.round(haversineKm(a, b) * 1000);
}

function bareNeighborhood(s: string) {
  return norm(s.replace(/\s+(mahallesi|mahalle|mah\.?|mh\.?)$/i, ""));
}

/** Returns a point, null when nothing matched, or undefined when the request itself failed. */
async function geocodePlace(q: string): Promise<GeoPoint | null | undefined> {
  const rows = await nominatimSearch<{ lat?: string; lon?: string; category?: string }>(
    `limit=5&addressdetails=0&q=${encodeURIComponent(q)}`,
  );
  if (!rows) return undefined;
  for (const row of rows) {
    if (row.category !== "place" && row.category !== "boundary") continue;
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inTurkey(lat, lng)) continue;
    return { lat, lng, source: "geocode" };
  }
  return null;
}

async function geocodeListingPlace(city: string, district: string, neighborhood: string) {
  const queries = [
    neighborhood && district ? `${neighborhood} Mahallesi, ${district}, ${city}, Türkiye` : "",
    neighborhood ? `${neighborhood}, ${district || city}, Türkiye` : "",
    district ? `${district}, ${city}, Türkiye` : "",
    !district || district === "Merkez" ? `${city}, Türkiye` : "",
  ].filter(Boolean);

  let failed = false;
  let point: GeoPoint | null = null;
  for (const q of queries) {
    const hit = await geocodePlace(q);
    if (hit === undefined) failed = true;
    if (hit) {
      point = hit;
      break;
    }
  }
  if (!point && district) {
    const pinned = DISTRICT_COORDS[keyOf(city, district)];
    if (pinned) point = { ...pinned, source: "district" };
  }
  if (!point && (!district || district === "Merkez")) {
    const cityPt = CITY_COORDS[city];
    if (cityPt) point = { ...cityPt, source: "city" };
  }
  return { point, ttl: point || !failed ? GEO_TTL_MS : FAIL_TTL_MS };
}

/** Saved listing coordinates always win; geocoding only runs for listings without them. */
export async function resolveListingCoords(input: {
  lat?: number | null;
  lng?: number | null;
  city: string;
  district?: string;
  neighborhood?: string;
}): Promise<GeoPoint | null> {
  if (input.lat != null && input.lng != null && Number.isFinite(input.lat) && Number.isFinite(input.lng)) {
    return { lat: input.lat, lng: input.lng, source: "listing" };
  }

  const city = norm(input.city);
  const district = norm(input.district ?? "");
  const neighborhood = bareNeighborhood(input.neighborhood ?? "");
  if (!city) return null;

  const key = placeKey(city, district, neighborhood);
  const cached = readCache(geoCache, key);
  if (cached !== undefined) return cached;
  const pending = geoInflight.get(key);
  if (pending) return pending;

  const job = geocodeListingPlace(city, district, neighborhood)
    .then(({ point, ttl }) => {
      writeCache(geoCache, key, point, ttl);
      return point;
    })
    .finally(() => geoInflight.delete(key));
  geoInflight.set(key, job);
  return job;
}

type OsmEl = {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function elPoint(el: OsmEl): { lat: number; lng: number } | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat: lat!, lng: lng! };
}

function classify(tags: Record<string, string> | undefined): { kind: NearbyKind; group: string } | null {
  if (!tags) return null;
  const amenity = tags.amenity ?? "";
  const shop = tags.shop ?? "";
  const leisure = tags.leisure ?? "";
  const highway = tags.highway ?? "";
  const railway = tags.railway ?? "";
  const pt = tags.public_transport ?? "";

  if (
    highway === "bus_stop" ||
    amenity === "bus_station" ||
    amenity === "taxi" ||
    railway === "station" ||
    railway === "halt" ||
    pt === "station" ||
    pt === "stop_position"
  ) {
    const group =
      amenity === "taxi" ? "TAKSİ DURAKLARI" : railway === "station" || railway === "halt" ? "RAYLI SİSTEM" : "OTOBÜS";
    return { kind: "transport", group };
  }
  if (amenity === "school" || amenity === "kindergarten" || amenity === "college" || amenity === "university") {
    return { kind: "education", group: amenity === "university" || amenity === "college" ? "YÜKSEKÖĞRETİM" : "OKULLAR" };
  }
  if (amenity === "hospital" || amenity === "clinic" || amenity === "doctors" || amenity === "pharmacy") {
    return { kind: "health", group: "SAĞLIK" };
  }
  if (leisure === "park" || leisure === "garden" || leisure === "playground") {
    return { kind: "green", group: "YEŞİL ALAN" };
  }
  if (leisure === "pitch" || leisure === "sports_centre" || leisure === "stadium" || leisure === "fitness_centre") {
    return { kind: "green", group: "SPOR" };
  }
  if (shop === "supermarket" || shop === "mall" || shop === "convenience" || amenity === "marketplace") {
    return { kind: "shopping", group: "ALIŞVERİŞ" };
  }
  return null;
}

function emptyBuckets(): Record<NearbyKind, NearbyItem[]> {
  return { transport: [], education: [], health: [], green: [], shopping: [] };
}

function finish(rows: NearbyItem[]) {
  return rows.sort((a, b) => a.meters - b.meters).slice(0, 8);
}

function coordKey(origin: { lat: number; lng: number }) {
  return `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}`;
}

async function overpassAll(origin: { lat: number; lng: number }): Promise<Record<NearbyKind, NearbyItem[]> | null> {
  const around = `around:2000,${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`;
  const nodeTags = [
    "highway=bus_stop",
    "amenity=taxi",
    "amenity=bus_station",
    "amenity=school",
    "amenity=kindergarten",
    "amenity=college",
    "amenity=university",
    "amenity=hospital",
    "amenity=clinic",
    "amenity=doctors",
    "amenity=pharmacy",
    "leisure=park",
    "leisure=garden",
    "leisure=playground",
    "leisure=pitch",
    "leisure=sports_centre",
    "leisure=stadium",
    "shop=supermarket",
    "shop=mall",
    "shop=convenience",
    "amenity=marketplace",
  ];
  const wayTags = ["leisure=park", "leisure=sports_centre", "amenity=hospital", "amenity=school", "shop=mall"];
  const query = `[out:json][timeout:4];(${[
    ...nodeTags.map((t) => `node(${around})[${t}];`),
    ...wayTags.map((t) => `way(${around})[${t}];`),
  ].join("")});out center 600;`;

  let elements: OsmEl[];
  try {
    elements = await Promise.any(
      OVERPASS_ENDPOINTS.map(async (endpoint) => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(4500),
        });
        if (!res.ok) throw new Error(`overpass ${res.status}`);
        return ((await res.json()) as { elements?: OsmEl[] }).elements ?? [];
      }),
    );
  } catch {
    overpassDownUntil = Date.now() + OVERPASS_COOLDOWN_MS;
    return null;
  }

  const buckets = emptyBuckets();
  const seen = new Set<string>();
  for (const el of elements) {
    const cls = classify(el.tags);
    const pt = elPoint(el);
    if (!cls || !pt) continue;
    const meters = metersBetween(origin, pt);
    if (meters > MAX_POI_METERS) continue;
    const name = el.tags?.name || el.tags?.["name:tr"] || el.tags?.operator;
    if (!name) continue;
    const id = `${cls.kind}|${cls.group}|${name.toLocaleLowerCase("tr")}`;
    if (seen.has(id)) continue;
    seen.add(id);
    buckets[cls.kind].push({ group: cls.group, name, meters });
  }
  for (const kind of Object.keys(buckets) as NearbyKind[]) buckets[kind] = finish(buckets[kind]);
  return Object.values(buckets).some((rows) => rows.length) ? buckets : null;
}

const NOMINATIM_QUERIES: Record<NearbyKind, string[]> = {
  transport: ["otobüs durağı", "taksi"],
  education: ["okul"],
  health: ["eczane", "hastane"],
  green: ["park", "sports centre"],
  shopping: ["süpermarket"],
};

async function nominatimKind(origin: { lat: number; lng: number }, kind: NearbyKind) {
  const d = 0.02;
  const viewbox = [origin.lng - d, origin.lat + d, origin.lng + d, origin.lat - d].map((n) => n.toFixed(6)).join(",");
  const rows: NearbyItem[] = [];
  const seen = new Set<string>();
  let failed = false;
  for (const q of NOMINATIM_QUERIES[kind]) {
    const hits = await nominatimSearch<{ lat?: string; lon?: string; name?: string; category?: string; type?: string }>(
      `limit=40&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(q)}`,
    );
    if (!hits) {
      failed = true;
      continue;
    }
    for (const hit of hits) {
      const cls = hit.category && hit.type ? classify({ [hit.category]: hit.type }) : null;
      if (!cls || cls.kind !== kind) continue;
      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const meters = metersBetween(origin, { lat, lng });
      if (meters > MAX_POI_METERS) continue;
      const name = hit.name?.trim();
      if (!name) continue;
      const id = `${cls.group}|${name.toLocaleLowerCase("tr")}`;
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push({ group: cls.group, name, meters });
    }
  }
  return { rows: finish(rows), failed };
}

/** Nearby places of one kind; OSM Overpass first (all kinds at once), Nominatim per kind when Overpass is down. */
export async function nearbyOfKind(origin: { lat: number; lng: number }, kind: NearbyKind): Promise<NearbyItem[]> {
  const key = coordKey(origin);
  const all = readCache(poiCache, key);
  if (all) return all[kind];
  const one = readCache(kindCache, `${key}|${kind}`);
  if (one) return one;

  if (Date.now() >= overpassDownUntil) {
    let pending = overpassInflight.get(key);
    if (!pending) {
      pending = overpassAll(origin).finally(() => overpassInflight.delete(key));
      overpassInflight.set(key, pending);
    }
    const buckets = await pending;
    if (buckets) {
      writeCache(poiCache, key, buckets, POI_TTL_MS);
      return buckets[kind];
    }
  }

  const { rows, failed } = await nominatimKind(origin, kind);
  writeCache(kindCache, `${key}|${kind}`, rows, rows.length || !failed ? POI_TTL_MS : FAIL_TTL_MS);
  return rows;
}
