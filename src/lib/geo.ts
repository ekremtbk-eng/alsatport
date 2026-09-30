/** Provincial capital coordinates (approx.) for nearby-listing alerts. */
export const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Adana: { lat: 37.0, lng: 35.321 },
  Adıyaman: { lat: 37.764, lng: 38.278 },
  Afyonkarahisar: { lat: 38.757, lng: 30.539 },
  Ağrı: { lat: 39.72, lng: 43.051 },
  Aksaray: { lat: 38.369, lng: 34.037 },
  Amasya: { lat: 40.65, lng: 35.833 },
  Ankara: { lat: 39.933, lng: 32.86 },
  Antalya: { lat: 36.897, lng: 30.713 },
  Ardahan: { lat: 41.111, lng: 42.702 },
  Artvin: { lat: 41.183, lng: 41.818 },
  Aydın: { lat: 37.844, lng: 27.846 },
  Balıkesir: { lat: 39.649, lng: 27.883 },
  Bartın: { lat: 41.636, lng: 32.338 },
  Batman: { lat: 37.881, lng: 41.135 },
  Bayburt: { lat: 40.256, lng: 40.223 },
  Bilecik: { lat: 40.142, lng: 29.979 },
  Bingöl: { lat: 38.885, lng: 40.498 },
  Bitlis: { lat: 38.4, lng: 42.109 },
  Bolu: { lat: 40.735, lng: 31.606 },
  Burdur: { lat: 37.721, lng: 30.291 },
  Bursa: { lat: 40.183, lng: 29.061 },
  Çanakkale: { lat: 40.155, lng: 26.414 },
  Çankırı: { lat: 40.6, lng: 33.616 },
  Çorum: { lat: 40.55, lng: 34.953 },
  Denizli: { lat: 37.776, lng: 29.086 },
  Diyarbakır: { lat: 37.914, lng: 40.231 },
  Düzce: { lat: 40.844, lng: 31.156 },
  Edirne: { lat: 41.677, lng: 26.556 },
  Elazığ: { lat: 38.681, lng: 39.227 },
  Erzincan: { lat: 39.75, lng: 39.5 },
  Erzurum: { lat: 39.905, lng: 41.268 },
  Eskişehir: { lat: 39.777, lng: 30.521 },
  Gaziantep: { lat: 37.066, lng: 37.383 },
  Giresun: { lat: 40.913, lng: 38.39 },
  Gümüşhane: { lat: 40.46, lng: 39.482 },
  Hakkari: { lat: 37.574, lng: 43.741 },
  Hatay: { lat: 36.202, lng: 36.16 },
  Iğdır: { lat: 39.917, lng: 44.045 },
  Isparta: { lat: 37.765, lng: 30.556 },
  İstanbul: { lat: 41.009, lng: 28.978 },
  İzmir: { lat: 38.423, lng: 27.143 },
  Kahramanmaraş: { lat: 37.585, lng: 36.937 },
  Karabük: { lat: 41.206, lng: 32.62 },
  Karaman: { lat: 37.181, lng: 33.215 },
  Kars: { lat: 40.602, lng: 43.097 },
  Kastamonu: { lat: 41.377, lng: 33.776 },
  Kayseri: { lat: 38.731, lng: 35.485 },
  Kırıkkale: { lat: 39.847, lng: 33.516 },
  Kırklareli: { lat: 41.735, lng: 27.225 },
  Kırşehir: { lat: 39.146, lng: 34.161 },
  Kilis: { lat: 36.718, lng: 37.121 },
  Kocaeli: { lat: 40.765, lng: 29.941 },
  Konya: { lat: 37.872, lng: 32.492 },
  Kütahya: { lat: 39.42, lng: 29.983 },
  Malatya: { lat: 38.355, lng: 38.334 },
  Manisa: { lat: 38.614, lng: 27.426 },
  Mardin: { lat: 37.313, lng: 40.735 },
  Mersin: { lat: 36.812, lng: 34.641 },
  Muğla: { lat: 37.215, lng: 28.364 },
  Muş: { lat: 38.744, lng: 41.507 },
  Nevşehir: { lat: 38.625, lng: 34.714 },
  Niğde: { lat: 37.967, lng: 34.679 },
  Ordu: { lat: 40.986, lng: 37.88 },
  Osmaniye: { lat: 37.075, lng: 36.25 },
  Rize: { lat: 41.021, lng: 40.523 },
  Sakarya: { lat: 40.756, lng: 30.378 },
  Samsun: { lat: 41.29, lng: 36.33 },
  Siirt: { lat: 37.927, lng: 41.94 },
  Sinop: { lat: 42.027, lng: 35.153 },
  Sivas: { lat: 39.748, lng: 37.016 },
  Şanlıurfa: { lat: 37.167, lng: 38.794 },
  Şırnak: { lat: 37.52, lng: 42.454 },
  Tekirdağ: { lat: 40.978, lng: 27.511 },
  Tokat: { lat: 40.324, lng: 36.552 },
  Trabzon: { lat: 41.005, lng: 39.727 },
  Tunceli: { lat: 39.108, lng: 39.54 },
  Uşak: { lat: 38.682, lng: 29.408 },
  Van: { lat: 38.501, lng: 43.373 },
  Yalova: { lat: 40.655, lng: 29.277 },
  Yozgat: { lat: 39.82, lng: 34.808 },
  Zonguldak: { lat: 41.456, lng: 31.799 },
};

export const NEARBY_KM = 80;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export function nearestCity(lat: number, lng: number) {
  let best = "İstanbul";
  let bestKm = Infinity;
  for (const [name, c] of Object.entries(CITY_COORDS)) {
    const km = haversineKm({ lat, lng }, c);
    if (km < bestKm) {
      bestKm = km;
      best = name;
    }
  }
  return { name: best, km: bestKm };
}

export function cityPoint(name: string) {
  return CITY_COORDS[name] ?? null;
}

export function isNearbyListing(
  listingCity: string,
  geo: { lat: number; lng: number; city?: string } | null,
  radiusKm = NEARBY_KM,
) {
  if (!geo) return false;
  if (geo.city && listingCity === geo.city) return true;
  const point = cityPoint(listingCity);
  if (!point) return false;
  return haversineKm({ lat: geo.lat, lng: geo.lng }, point) <= radiusKm;
}
