export type Density = "high" | "mid" | "low";

export type RegionStats = {
  age: number;
  uni: number;
  pop: number;
  married: number;
  single: number;
  unspecified: number;
  sqm: number;
  density: Density;
};

export function keyOf(city: string, district: string) {
  return `${norm(city)}|${norm(district)}`;
}

export function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

/** İlçe merkezi koordinatları — harita ilan ilçesine kilitlenir. */
export const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  "İstanbul|Kadıköy": { lat: 40.9905, lng: 29.029 },
  "İstanbul|Beşiktaş": { lat: 41.0422, lng: 29.0083 },
  "İstanbul|Şişli": { lat: 41.0602, lng: 28.987 },
  "İstanbul|Üsküdar": { lat: 41.0228, lng: 29.015 },
  "İstanbul|Fatih": { lat: 41.0186, lng: 28.9394 },
  "İstanbul|Beyoğlu": { lat: 41.037, lng: 28.985 },
  "İstanbul|Bakırköy": { lat: 40.981, lng: 28.872 },
  "İstanbul|Ataşehir": { lat: 40.9923, lng: 29.124 },
  "İstanbul|Maltepe": { lat: 40.935, lng: 29.151 },
  "İstanbul|Pendik": { lat: 40.877, lng: 29.259 },
  "İstanbul|Sarıyer": { lat: 41.166, lng: 29.05 },
  "İstanbul|Esenyurt": { lat: 41.034, lng: 28.675 },
  "İstanbul|Başakşehir": { lat: 41.093, lng: 28.802 },
  "İstanbul|Ümraniye": { lat: 41.016, lng: 29.124 },
  "İstanbul|Kartal": { lat: 40.888, lng: 29.187 },
  "Ankara|Çankaya": { lat: 39.901, lng: 32.859 },
  "Ankara|Keçiören": { lat: 39.973, lng: 32.863 },
  "Ankara|Mamak": { lat: 39.936, lng: 32.915 },
  "Ankara|Yenimahalle": { lat: 39.966, lng: 32.811 },
  "Ankara|Etimesgut": { lat: 39.946, lng: 32.667 },
  "Ankara|Sincan": { lat: 39.972, lng: 32.574 },
  "Ankara|Gölbaşı": { lat: 39.79, lng: 32.808 },
  "İzmir|Konak": { lat: 38.419, lng: 27.129 },
  "İzmir|Karşıyaka": { lat: 38.455, lng: 27.11 },
  "İzmir|Bornova": { lat: 38.47, lng: 27.22 },
  "İzmir|Buca": { lat: 38.386, lng: 27.178 },
  "İzmir|Çeşme": { lat: 38.324, lng: 26.306 },
  "Bolu|Merkez": { lat: 40.7392, lng: 31.6113 },
  "Antalya|Muratpaşa": { lat: 36.887, lng: 30.71 },
  "Antalya|Konyaaltı": { lat: 36.87, lng: 30.64 },
  "Bursa|Nilüfer": { lat: 40.213, lng: 28.984 },
  "Bursa|Osmangazi": { lat: 40.199, lng: 29.06 },
  "Eskişehir|Tepebaşı": { lat: 39.784, lng: 30.519 },
  "Eskişehir|Odunpazarı": { lat: 39.766, lng: 30.525 },
  "Mersin|Toroslar": { lat: 36.8716, lng: 34.6123 },
  "Mersin|Yenişehir": { lat: 36.784, lng: 34.59 },
  "Mersin|Mezitli": { lat: 36.755, lng: 34.525 },
  "Mersin|Akdeniz": { lat: 36.8, lng: 34.633 },
};

/** Mahalle katalogu: aynı il+ilçe+mahalle → aynı demografik kart. */
export const MAHALLELER: Record<string, string[]> = {
  "İstanbul|Kadıköy": ["Caferağa", "Osmanağa", "Rasimpaşa", "Moda", "Fenerbahçe", "Göztepe", "Erenköy", "Suadiye"],
  "İstanbul|Beşiktaş": ["Levent", "Etiler", "Bebek", "Ortaköy", "Sinanpaşa", "Türkali"],
  "İstanbul|Şişli": ["Nişantaşı", "Teşvikiye", "Mecidiyeköy", "Bomonti", "Halaskargazi"],
  "İstanbul|Üsküdar": ["Çengelköy", "Beylerbeyi", "Kuzguncuk", "Acıbadem", "Altunizade"],
  "İstanbul|Fatih": ["Sultanahmet", "Fener", "Balat", "Aksaray", "Kocamustafapaşa"],
  "İstanbul|Esenyurt": ["Mehmet Akif Ersoy", "Yenikent", "Fatih", "Saadetdere", "Pınar"],
  "Ankara|Çankaya": ["Kızılay", "Çukurambar", "Oran", "Gaziosmanpaşa", "Ayrancı", "Birlik", "Yıldız"],
  "Ankara|Keçiören": ["Etlik", "Kalaba", "Aktepe", "Ovacık"],
  "Ankara|Mamak": ["Akdere", "Hürel", "Kutlu", "Şahintepe"],
  "İzmir|Konak": ["Alsancak", "Kemeraltı", "Güzelyalı", "Göztepe"],
  "İzmir|Karşıyaka": ["Bostanlı", "Mavişehir", "Alaybey", "Nergiz"],
  "İzmir|Bornova": ["Erzene", "Kazımdirik", "Evka-3", "Merkez"],
  "Bolu|Merkez": ["Boranazlar", "Karamanlı", "Akpınar", "İzzet Baysal", "Kılıçarslan"],
  "Antalya|Muratpaşa": ["Şirinyalı", "Meltem", "Güzeloba", "Fener"],
  "Bursa|Nilüfer": ["Özlüce", "Görükle", "İhsaniye", "Konak"],
  "Eskişehir|Tepebaşı": ["Şeker", "Uluönder", "Hoşnudiye", "Çamlıca"],
};

const CITY_BASE: Record<string, Omit<RegionStats, "unspecified">> = {
  İstanbul: { age: 33, uni: 28, pop: 18400, married: 48, single: 41, sqm: 185000, density: "high" },
  Ankara: { age: 34, uni: 32, pop: 14200, married: 51, single: 37, sqm: 72000, density: "high" },
  İzmir: { age: 36, uni: 27, pop: 12800, married: 50, single: 38, sqm: 78000, density: "high" },
  Bursa: { age: 34, uni: 22, pop: 15100, married: 54, single: 34, sqm: 42000, density: "mid" },
  Antalya: { age: 35, uni: 24, pop: 11900, married: 52, single: 36, sqm: 68000, density: "mid" },
  Kocaeli: { age: 33, uni: 23, pop: 16200, married: 55, single: 33, sqm: 38000, density: "mid" },
  Adana: { age: 32, uni: 20, pop: 17100, married: 56, single: 32, sqm: 28000, density: "mid" },
  Konya: { age: 31, uni: 21, pop: 14800, married: 58, single: 30, sqm: 26000, density: "mid" },
  Gaziantep: { age: 27, uni: 16, pop: 19800, married: 57, single: 32, sqm: 24000, density: "mid" },
  Kayseri: { age: 32, uni: 22, pop: 13600, married: 57, single: 31, sqm: 25000, density: "mid" },
  Mersin: { age: 33, uni: 21, pop: 14100, married: 54, single: 34, sqm: 31000, density: "mid" },
  Eskişehir: { age: 35, uni: 34, pop: 11200, married: 48, single: 41, sqm: 32000, density: "mid" },
  Samsun: { age: 36, uni: 22, pop: 12500, married: 55, single: 33, sqm: 27000, density: "mid" },
  Trabzon: { age: 37, uni: 23, pop: 9800, married: 56, single: 32, sqm: 29000, density: "mid" },
  Diyarbakır: { age: 24, uni: 15, pop: 18600, married: 52, single: 37, sqm: 18000, density: "mid" },
  Şanlıurfa: { age: 21, uni: 12, pop: 21200, married: 54, single: 36, sqm: 14000, density: "mid" },
  Van: { age: 23, uni: 14, pop: 16800, married: 53, single: 36, sqm: 15000, density: "low" },
  Erzurum: { age: 28, uni: 22, pop: 10200, married: 55, single: 33, sqm: 16000, density: "low" },
  Bolu: { age: 38, uni: 24, pop: 8200, married: 57, single: 31, sqm: 22000, density: "low" },
  Muğla: { age: 39, uni: 26, pop: 7600, married: 53, single: 35, sqm: 95000, density: "low" },
  Aydın: { age: 40, uni: 20, pop: 8900, married: 56, single: 32, sqm: 36000, density: "low" },
  Balıkesir: { age: 41, uni: 19, pop: 9100, married: 57, single: 31, sqm: 30000, density: "low" },
  Tekirdağ: { age: 34, uni: 21, pop: 13400, married: 54, single: 34, sqm: 34000, density: "mid" },
  Sakarya: { age: 34, uni: 21, pop: 12800, married: 55, single: 33, sqm: 28000, density: "mid" },
};

const DISTRICT_BASE: Record<string, Partial<Omit<RegionStats, "unspecified">>> = {
  "İstanbul|Kadıköy": { age: 37, uni: 46, pop: 12480, married: 44, single: 47, sqm: 265000, density: "high" },
  "İstanbul|Beşiktaş": { age: 38, uni: 52, pop: 9800, married: 42, single: 49, sqm: 310000, density: "high" },
  "İstanbul|Şişli": { age: 35, uni: 44, pop: 15600, married: 43, single: 48, sqm: 248000, density: "high" },
  "İstanbul|Sarıyer": { age: 36, uni: 41, pop: 11200, married: 48, single: 42, sqm: 295000, density: "mid" },
  "İstanbul|Bakırköy": { age: 40, uni: 38, pop: 14800, married: 49, single: 40, sqm: 210000, density: "high" },
  "İstanbul|Ataşehir": { age: 34, uni: 42, pop: 16800, married: 47, single: 43, sqm: 198000, density: "high" },
  "İstanbul|Fatih": { age: 35, uni: 24, pop: 19200, married: 51, single: 37, sqm: 175000, density: "high" },
  "İstanbul|Beyoğlu": { age: 34, uni: 33, pop: 10100, married: 39, single: 51, sqm: 220000, density: "high" },
  "İstanbul|Esenyurt": { age: 28, uni: 16, pop: 28400, married: 52, single: 38, sqm: 72000, density: "high" },
  "İstanbul|Başakşehir": { age: 31, uni: 29, pop: 22100, married: 56, single: 34, sqm: 98000, density: "mid" },
  "İstanbul|Pendik": { age: 33, uni: 22, pop: 20100, married: 55, single: 34, sqm: 88000, density: "mid" },
  "İstanbul|Ümraniye": { age: 32, uni: 26, pop: 21400, married: 54, single: 35, sqm: 105000, density: "high" },
  "Ankara|Çankaya": { age: 36, uni: 48, pop: 13100, married: 46, single: 44, sqm: 118000, density: "high" },
  "Ankara|Keçiören": { age: 33, uni: 24, pop: 19800, married: 56, single: 33, sqm: 52000, density: "high" },
  "Ankara|Mamak": { age: 32, uni: 18, pop: 17600, married: 57, single: 32, sqm: 38000, density: "mid" },
  "Ankara|Yenimahalle": { age: 35, uni: 31, pop: 16200, married: 53, single: 36, sqm: 64000, density: "high" },
  "Ankara|Etimesgut": { age: 32, uni: 33, pop: 18400, married: 54, single: 35, sqm: 58000, density: "mid" },
  "Ankara|Sincan": { age: 31, uni: 19, pop: 20500, married: 58, single: 31, sqm: 34000, density: "mid" },
  "İzmir|Konak": { age: 38, uni: 36, pop: 10800, married: 47, single: 42, sqm: 92000, density: "high" },
  "İzmir|Karşıyaka": { age: 40, uni: 34, pop: 12100, married: 50, single: 39, sqm: 98000, density: "high" },
  "İzmir|Bornova": { age: 33, uni: 41, pop: 13900, married: 45, single: 44, sqm: 76000, density: "high" },
  "İzmir|Çeşme": { age: 42, uni: 29, pop: 5400, married: 52, single: 36, sqm: 145000, density: "low" },
  "Bolu|Merkez": { age: 37, uni: 26, pop: 7640, married: 56, single: 32, sqm: 24500, density: "low" },
  "Antalya|Muratpaşa": { age: 36, uni: 29, pop: 13200, married: 49, single: 40, sqm: 89000, density: "high" },
  "Antalya|Konyaaltı": { age: 38, uni: 31, pop: 11800, married: 51, single: 38, sqm: 102000, density: "mid" },
  "Bursa|Nilüfer": { age: 35, uni: 38, pop: 14100, married: 50, single: 39, sqm: 62000, density: "mid" },
  "Bursa|Osmangazi": { age: 34, uni: 21, pop: 17800, married: 55, single: 34, sqm: 36000, density: "high" },
  "Eskişehir|Tepebaşı": { age: 32, uni: 39, pop: 10900, married: 44, single: 46, sqm: 34000, density: "mid" },
  "Eskişehir|Odunpazarı": { age: 36, uni: 31, pop: 11400, married: 49, single: 40, sqm: 32000, density: "mid" },
};

const DEFAULT_MAHALLE = ["Merkez Mah.", "Yeni Mah.", "Cumhuriyet Mah.", "Atatürk Mah.", "Yıldız Mah.", "Gültepe", "Bahçelievler"];

export type NearbyKind = "transport" | "education" | "health" | "green" | "shopping";
export type NearbyItem = { group: string; name: string; meters: number };

const POI: Record<string, Record<NearbyKind, { group: string; names: string[] }[]>> = {
  "İstanbul|Kadıköy": {
    transport: [
      { group: "RAYLI SİSTEM", names: ["Kadıköy Metro M4", "Kadıköy Tramvay", "Kadıköy Vapur İskelesi"] },
      { group: "OTOBÜS / TAKSİ", names: ["Moda Caddesi Durağı", "Kadıköy Taksi Durağı", "Minibüs (Bostancı)"] },
    ],
    education: [
      { group: "OKULLAR", names: ["Kadıköy Anadolu Lisesi", "Moda İlkokulu", "Caferağa Ortaokulu"] },
      { group: "YÜKSEKÖĞRETİM", names: ["Marmara Göztepe Kampüsü", "Halk Eğitim Merkezi"] },
    ],
    health: [{ group: "SAĞLIK", names: ["Kadıköy Belediyesi ASM", "Eğitim Araştırma Hastanesi", "Moda Eczane"] }],
    green: [
      { group: "YEŞİL ALAN", names: ["Moda Parkı", "Özgürlük Parkı", "Fenerbahçe Parkı"] },
      { group: "SPOR", names: ["Caddebostan Sahil", "Göztepe Spor Tesisleri"] },
    ],
    shopping: [{ group: "ALIŞVERİŞ", names: ["Bahariye Caddesi", "Tepe Nautilus", "Kadıköy Çarşısı", "Market"] }],
  },
  "Ankara|Çankaya": {
    transport: [
      { group: "RAYLI SİSTEM", names: ["Kızılay Metro", "Kızılay Ankaray", "Tunus Caddesi Durağı"] },
      { group: "OTOBÜS / TAKSİ", names: ["EGO Kızılay Aktarma", "Çankaya Taksi", "Ayrancı Durağı"] },
    ],
    education: [
      { group: "OKULLAR", names: ["TED Ankara Koleji", "Anıttepe İlkokulu", "Çankaya Lisesi"] },
      { group: "YÜKSEKÖĞRETİM", names: ["Hacettepe Sıhhiye", "ODTÜ (bağlantı)", "Bilkent (bağlantı)"] },
    ],
    health: [{ group: "SAĞLIK", names: ["Çankaya ASM", "Bayındır Hastanesi", "Kızılay Eczane"] }],
    green: [
      { group: "YEŞİL ALAN", names: ["Kuğulu Park", "Botanik Park", "Seğmenler Parkı"] },
      { group: "SPOR", names: ["19 Mayıs Stadyumu çevresi", "Çankaya Spor Salonu"] },
    ],
    shopping: [{ group: "ALIŞVERİŞ", names: ["Tunalı Hilmi", "Karum", "Kızılay AVM", "Çankaya Çarşısı"] }],
  },
  "Bolu|Merkez": {
    transport: [
      { group: "OTOBÜS", names: ["Bolu Otogarı aktarma", "İzzet Baysal Caddesi Durağı", "Belediye Otobüs Durağı"] },
      { group: "TAKSİ DURAKLARI", names: ["Bolu Merkez Taksi", "Stadyum Taksi", "7 / 24 Ticaret Taksi"] },
    ],
    education: [
      { group: "OKULLAR", names: ["Bolu Anadolu Lisesi", "Atatürk İlkokulu", "Abant İzzet Baysal Kampüsü"] },
    ],
    health: [{ group: "SAĞLIK", names: ["Bolu İzzet Baysal Eğitim Araştırma", "Merkez ASM", "Eczane"] }],
    green: [
      { group: "YEŞİL ALAN", names: ["Bolu Kent Ormanı bağlantısı", "Stadyum Parkı", "Çocuk Parkı"] },
      { group: "SPOR", names: ["Bolu Spor Tesisi", "Yüzme Havuzu"] },
    ],
    shopping: [{ group: "ALIŞVERİŞ", names: ["Bolu Çarşı", "AVM", "Semt Pazarı", "Market"] }],
  },
};

const GENERIC_POI: Record<NearbyKind, { group: string; names: string[] }[]> = {
  transport: [
    { group: "OTOBÜS", names: ["Belediye Otobüs Durağı", "Minibüs Durağı", "Aktarma Noktası"] },
    { group: "TAKSİ DURAKLARI", names: ["Merkez Taksi", "Çarşı Taksi", "7 / 24 Taksi"] },
  ],
  education: [
    { group: "OKULLAR", names: ["Atatürk İlkokulu", "Cumhuriyet Ortaokulu", "Anadolu Lisesi"] },
    { group: "YÜKSEKÖĞRETİM", names: ["Halk Eğitim Merkezi", "Meslek Yüksekokulu"] },
  ],
  health: [{ group: "SAĞLIK", names: ["Aile Sağlığı Merkezi", "Devlet Hastanesi", "Eczane"] }],
  green: [
    { group: "YEŞİL ALAN", names: ["Millet Bahçesi", "Şehir Parkı", "Çocuk Parkı"] },
    { group: "SPOR", names: ["Semt Sahası", "Spor Salonu"] },
  ],
  shopping: [{ group: "ALIŞVERİŞ", names: ["Semt Pazarı", "AVM", "Market", "Çarşı"] }],
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function complete(p: Omit<RegionStats, "unspecified">): RegionStats {
  const unspecified = Math.max(0, 100 - p.married - p.single);
  return { ...p, unspecified, married: p.married, single: 100 - p.married - unspecified };
}

export function mahallelerOf(city?: string, district?: string): string[] {
  if (!city || !district) return [];
  return MAHALLELER[keyOf(city, district)] ?? [...DEFAULT_MAHALLE];
}

export function mahalleFor(city: string, district: string, listingId: string) {
  const k = keyOf(city, district);
  const list = MAHALLELER[k] ?? DEFAULT_MAHALLE;
  return list[hash(`${k}|${listingId}`) % list.length]!;
}

export function statsFor(city: string, district: string, mahalle: string): RegionStats {
  const cityRow = CITY_BASE[norm(city)] ?? {
    age: 34,
    uni: 20,
    pop: 11000,
    married: 54,
    single: 34,
    sqm: 22000,
    density: "low" as Density,
  };
  const dist = DISTRICT_BASE[keyOf(city, district)] ?? {};
  const merged = { ...cityRow, ...dist };
  const n = hash(`${keyOf(city, district)}|${mahalle}`);
  const pop = Math.max(2800, merged.pop + ((n % 1600) - 800));
  const age = Math.min(46, Math.max(21, merged.age + ((n % 5) - 2)));
  const uni = Math.min(58, Math.max(10, merged.uni + ((n % 5) - 2)));
  return complete({
    age,
    uni,
    pop,
    married: merged.married,
    single: merged.single,
    sqm: merged.sqm,
    density: merged.density,
  });
}

export function nearbyFor(city: string, district: string, mahalle: string, density: Density) {
  const k = keyOf(city, district);
  const catalog = POI[k] ?? GENERIC_POI;
  const span = density === "high" ? 420 : density === "mid" ? 720 : 1100;
  const base = density === "high" ? 70 : density === "mid" ? 140 : 240;
  const n = hash(`${k}|${mahalle}|poi`);
  const out: Record<NearbyKind, NearbyItem[]> = {
    transport: [],
    education: [],
    health: [],
    green: [],
    shopping: [],
  };
  (Object.keys(catalog) as NearbyKind[]).forEach((kind, ki) => {
    catalog[kind].forEach((block, bi) => {
      block.names.forEach((name, i) => {
        const meters = base + ((n >>> (i + ki + bi)) % span);
        out[kind].push({
          group: block.group,
          name: name.includes(district) ? name : name,
          meters,
        });
      });
    });
  });
  return out;
}

export function sqmFor(stats: RegionStats, listingPrice: number) {
  const fromListing = listingPrice > 400_000 ? Math.round(listingPrice / 95) : stats.sqm;
  const blended = Math.round((stats.sqm * 0.82 + fromListing * 0.18) / 500) * 500;
  return Math.max(12_000, blended);
}
