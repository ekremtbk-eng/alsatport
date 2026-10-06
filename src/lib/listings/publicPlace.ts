import { findListingRecord, toClientListing } from "@/lib/listings/store";
import { isUuid } from "@/lib/ids";
import { isBlockedLiveAnimalListing } from "@/lib/liveAnimalPolicy";
import { resolveListingCoords, type GeoPoint } from "@/lib/placeGeo";

export type PublicPlace = {
  place: { city: string; district: string; neighborhood: string };
  coords: GeoPoint | null;
};

/** Location of an active, publicly visible listing; saved lat/lng first, geocoding only as fallback. */
export async function publicListingPlace(id: string): Promise<PublicPlace | "bad-id" | "not-found"> {
  if (!isUuid(id)) return "bad-id";
  const row = await findListingRecord(id);
  if (!row || row.status !== "active") return "not-found";
  const listing = toClientListing(row);
  if (isBlockedLiveAnimalListing(listing)) return "not-found";

  const coords = await resolveListingCoords({
    lat: row.lat,
    lng: row.lng,
    city: row.city,
    district: row.district,
    neighborhood: row.neighborhood,
  });
  return {
    place: { city: row.city, district: row.district, neighborhood: row.neighborhood || "" },
    coords,
  };
}

export function regionCacheHeader(found: boolean) {
  return found ? "public, s-maxage=86400, stale-while-revalidate=604800" : "public, s-maxage=300";
}
