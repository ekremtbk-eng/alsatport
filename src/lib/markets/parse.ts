export type FxPair = { buy: number; sell: number };
export type DailyBulletin = { date: string; updatedAt: string | null; usd: FxPair; eur: FxPair };
export type GoldPrint = { updatedAt: string | null; buy: number; purity: "xas" | "xau" };

const FX_MIN = 5;
const FX_MAX = 500;
const GOLD_MIN = 100;
const GOLD_MAX = 100_000;
const CHANGE_CAP = 25;

function tagNumber(body: string, tag: string) {
  const match = body.match(new RegExp(`<${tag}>(\\d{1,6}(?:[.,]\\d{1,6})?)</${tag}>`));
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function inRange(value: number, min: number, max: number) {
  return value >= min && value <= max;
}

function pair(xml: string, code: "USD" | "EUR"): FxPair | null {
  const block = xml.match(new RegExp(`<Currency\\b[^>]*\\bCurrencyCode="${code}"[^>]*>([\\s\\S]*?)</Currency>`));
  if (!block) return null;
  const buy = tagNumber(block[1], "ForexBuying");
  const sell = tagNumber(block[1], "ForexSelling");
  if (buy == null || sell == null || !inRange(buy, FX_MIN, FX_MAX) || !inRange(sell, FX_MIN, FX_MAX)) return null;
  return { buy, sell };
}

function bulletinInstant(date: string, lastModified: string | null) {
  if (lastModified && !Number.isNaN(Date.parse(lastModified))) return new Date(lastModified).toISOString();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}T15:30:00+03:00`;
}

export function parseDailyBulletin(xml: string, lastModified: string | null = null): DailyBulletin | null {
  if (!xml || xml.length > 250_000) return null;
  const stamp = xml.match(/<Tarih_Date\b[^>]*\bDate="(\d{2})\/(\d{2})\/(\d{4})"/);
  if (!stamp) return null;
  const date = `${stamp[3]}-${stamp[1]}-${stamp[2]}`;
  const usd = pair(xml, "USD");
  const eur = pair(xml, "EUR");
  if (!usd || !eur) return null;
  return { date, updatedAt: bulletinInstant(date, lastModified), usd, eur };
}

function metalBuy(xml: string, code: "XAS" | "XAU") {
  const match = xml.match(
    new RegExp(`<doviz_cinsi>${code}</doviz_cinsi>[\\s\\S]{0,180}?<alis>(\\d{1,6}(?:[.,]\\d{1,4})?)</alis>`),
  );
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && inRange(value, GOLD_MIN, GOLD_MAX) ? value : null;
}

export function parseGoldBulletin(xml: string): GoldPrint | null {
  if (!xml || xml.length > 250_000 || !xml.includes("<doviz_cinsi>")) return null;
  const xas = metalBuy(xml, "XAS");
  const xau = metalBuy(xml, "XAU");
  const buy = xas ?? xau;
  if (buy == null) return null;
  const stamped = xml.match(/<zaman_etiketi>(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\+\d{2}:\d{2})?)<\/zaman_etiketi>/);
  return { buy, purity: xas != null ? "xas" : "xau", updatedAt: stamped ? stamped[1] : null };
}

export const TROY_OUNCE_GRAMS = 31.1034768;

export type SpotPrint = { symbol: "XAU" | "BTC"; price: number; updatedAt: string };

const SPOT_RANGE = { XAU: [500, 20_000], BTC: [1_000, 5_000_000] } as const;
const SPOT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export function parseSpot(raw: unknown, symbol: "XAU" | "BTC", now = Date.now()): SpotPrint | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (row.symbol !== symbol || row.currency !== "USD") return null;
  if (typeof row.price !== "number" || !Number.isFinite(row.price)) return null;
  const [min, max] = SPOT_RANGE[symbol];
  if (row.price < min || row.price > max) return null;
  if (typeof row.updatedAt !== "string" || Number.isNaN(Date.parse(row.updatedAt))) return null;
  const age = now - Date.parse(row.updatedAt);
  if (age < -5 * 60 * 1000 || age > SPOT_MAX_AGE_MS) return null;
  return { symbol, price: row.price, updatedAt: new Date(row.updatedAt).toISOString() };
}

export function gramSpotTry(ounceUsd: number, usdBuy: number, usdSell: number) {
  if (![ounceUsd, usdBuy, usdSell].every((value) => Number.isFinite(value) && value > 0)) return null;
  const gram = (ounceUsd / TROY_OUNCE_GRAMS) * ((usdBuy + usdSell) / 2);
  if (!Number.isFinite(gram) || gram < GOLD_MIN || gram > GOLD_MAX) return null;
  return Math.round(gram * 100) / 100;
}

export function changePct(current: number, previous: number | null) {
  if (previous == null || previous <= 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) > CHANGE_CAP) return null;
  return Math.round(pct * 100) / 100;
}
