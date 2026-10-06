export type NearbyKind = "transport" | "education" | "health" | "green" | "shopping";
export type NearbyItem = { group: string; name: string; meters: number };
export type RegionCoords = { lat: number; lng: number; source?: string } | null;

export const NEARBY_KINDS: NearbyKind[] = ["transport", "education", "health", "green", "shopping"];

type PlaceLike = {
  id: string;
  city: string;
  district: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
};

export function formatDistance(meters: number) {
  if (meters < 1000) return `${meters} m`;
  const km = meters / 1000;
  const text = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  return `${text.replace(".", ",")} km`;
}

/** Changes whenever the listing location changes, so CDN entries never outlive an edit. */
export function regionVersion(listing: PlaceLike) {
  return ["g3", listing.city, listing.district, listing.neighborhood ?? "", listing.lat ?? "", listing.lng ?? ""].join("|");
}

const memo = new Map<string, Promise<unknown>>();

function load<T>(url: string, pick: (json: unknown) => T, fallback: T): Promise<T> {
  const hit = memo.get(url) as Promise<T> | undefined;
  if (hit) return hit;
  const promise = fetch(url)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then(pick)
    .catch(() => {
      memo.delete(url);
      return fallback;
    });
  memo.set(url, promise);
  return promise;
}

function base(listing: PlaceLike) {
  return `/api/listings/${encodeURIComponent(listing.id)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** undefined = request failed; null = no location could be determined. */
export function loadRegionCoords(listing: PlaceLike): Promise<RegionCoords | undefined> {
  if (!UUID_RE.test(listing.id)) return Promise.resolve(null);
  const qs = new URLSearchParams({ v: regionVersion(listing) });
  return load<RegionCoords | undefined>(
    `${base(listing)}/region?${qs}`,
    (json) => {
      const c = (json as { coords?: RegionCoords })?.coords;
      return c && Number.isFinite(c.lat) && Number.isFinite(c.lng) ? c : null;
    },
    undefined,
  );
}

/** null = request failed. */
export function loadNearby(listing: PlaceLike, kind: NearbyKind): Promise<NearbyItem[] | null> {
  if (!UUID_RE.test(listing.id)) return Promise.resolve([]);
  const qs = new URLSearchParams({ kind, v: regionVersion(listing) });
  return load<NearbyItem[] | null>(
    `${base(listing)}/nearby?${qs}`,
    (json) => {
      const items = (json as { items?: NearbyItem[] })?.items;
      return Array.isArray(items) ? items : [];
    },
    null,
  );
}

export function prefetchRegion(listing: PlaceLike, withNearby = false) {
  void loadRegionCoords(listing).then((coords) => {
    if (withNearby && coords) void loadNearby(listing, NEARBY_KINDS[0]);
  });
}
