export function hashSeed(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

const KNOWN: Record<string, { since: string; year: number; store?: boolean }> = {
  "u-ekrem": { since: "Mart 2018", year: 2018, store: true },
  "u-selim": { since: "Haziran 2019", year: 2019, store: true },
  "u-ayse": { since: "Ocak 2021", year: 2021 },
  "u-burak": { since: "Eylül 2020", year: 2020, store: true },
  "u-ahmet": { since: "Nisan 2017", year: 2017, store: true },
  "u-merve": { since: "Şubat 2022", year: 2022 },
  "u-fatma": { since: "Kasım 2019", year: 2019 },
};

export function sellerLicenseNo(sellerId: string) {
  const n = 100000 + (hashSeed(`yb:${sellerId}`) % 900000);
  return String(n);
}

export function sellerTenure(sellerId: string, nowYear = 2026) {
  const known = KNOWN[sellerId];
  const year = known?.year ?? 2018 + (hashSeed(sellerId) % 7);
  const years = Math.max(1, nowYear - year);
  return {
    year,
    years,
    sinceLabel: known?.since ?? String(year),
    store: Boolean(known?.store),
  };
}
