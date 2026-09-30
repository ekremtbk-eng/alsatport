/** İlan fiyatı: yalnızca pozitif tam sayı, en fazla 12 hane. */
export function parseListingPrice(raw: string): number | null {
  const d = raw.replace(/\D/g, "");
  if (!d || d.length > 12) return null;
  const n = Number(d);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
