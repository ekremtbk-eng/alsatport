import { coordsForPlace } from "@/data/cityCoords";
import {
  mahalleFor,
  nearbyFor,
  sqmFor,
  statsFor,
  type NearbyItem,
  type NearbyKind,
} from "@/data/regionProfiles";

export type { NearbyItem, NearbyKind };

export function regionIntel(city: string, district: string, listingId: string, priceTry: number) {
  const mahalle = mahalleFor(city, district, listingId);
  const demo = statsFor(city, district, mahalle);
  const nearby = nearbyFor(city, district, mahalle, demo.density);
  const coords = coordsForPlace(city, district, mahalle);
  return {
    mahalle,
    coords,
    nearby,
    demo,
    sqm: sqmFor(demo, priceTry),
    year: 2023,
  };
}

export function osmEmbed(lat: number, lng: number) {
  const d = 0.016;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function satelliteEmbed(lat: number, lng: number) {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=15&t=k&hl=tr&output=embed`;
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
