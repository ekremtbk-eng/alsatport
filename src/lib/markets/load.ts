import { setDefaultResultOrder } from "node:dns";
import "server-only";

import { assembleMarkets } from "@/lib/markets/assemble";
import { parseDailyBulletin, parseGoldBulletin, parseSpot, type DailyBulletin, type GoldPrint, type SpotPrint } from "@/lib/markets/parse";
import { MARKET_IDS, unavailableQuote, type MarketQuote, type MarketsPayload } from "@/lib/markets/types";

setDefaultResultOrder("ipv4first");

const FRESH_MS = 10 * 60 * 1000;
const SPOT_FRESH_MS = 30 * 1000;
const KEEP_MS = 24 * 60 * 60 * 1000;
const GOLD_HOURS = [15, 14, 13, 12, 11, 10];

type XmlDoc = { text: string; lastModified: string | null };
type Ymd = { y: number; m: number; d: number };
type FxCache = { at: number; bulletins: DailyBulletin[]; gold: GoldPrint[] };
type SpotSide = { print: SpotPrint | null; at: number; stale: boolean };

let fxCache: FxCache | null = null;
let fxNext = 0;
let fxInflight: Promise<FxCache | null> | null = null;
let xauSide: SpotSide = { print: null, at: 0, stale: false };
let btcSide: SpotSide = { print: null, at: 0, stale: false };
let spotNext = 0;
let spotInflight: Promise<void> | null = null;

function istanbulNow(now = new Date()): Ymd & { hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { y: pick("year"), m: pick("month"), d: pick("day"), hour: pick("hour") };
}

function shiftDays(date: Ymd, days: number): Ymd {
  const next = new Date(Date.UTC(date.y, date.m - 1, date.d + days));
  return { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() };
}

function isWeekend(date: Ymd) {
  const day = new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay();
  return day === 0 || day === 6;
}

function previousWeekdays(start: Ymd, count: number) {
  const dates: Ymd[] = [];
  let cursor = start;
  while (dates.length < count) {
    cursor = shiftDays(cursor, -1);
    if (!isWeekend(cursor)) dates.push(cursor);
  }
  return dates;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dailyUrl(date: Ymd) {
  const month = pad(date.m);
  const day = pad(date.d);
  return `https://www.tcmb.gov.tr/kurlar/${date.y}${month}/${day}${month}${date.y}.xml`;
}

function goldUrl(date: Ymd, hour: number) {
  const month = pad(date.m);
  const day = pad(date.d);
  return `https://www.tcmb.gov.tr/reeskontkur/${date.y}${month}/${day}${month}${date.y}-${pad(hour)}00.xml`;
}

async function getXml(url: string): Promise<XmlDoc | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: { Accept: "application/xml, text/xml;q=0.9", "User-Agent": "AlSatPortMarket/1.0" },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 250_000 || !text.includes("<")) return null;
    const header = res.headers.get("last-modified");
    const lastModified = header && !Number.isNaN(Date.parse(header)) ? new Date(header).toISOString() : null;
    return { text, lastModified };
  } catch {
    return null;
  }
}

async function loadBulletins(today: Ymd) {
  const dates = previousWeekdays(today, 7);
  const [current, ...history] = await Promise.all([
    getXml("https://www.tcmb.gov.tr/kurlar/today.xml"),
    ...dates.map((date) => getXml(dailyUrl(date))),
  ]);
  const parsed: DailyBulletin[] = [];
  const seen = new Set<string>();
  for (const doc of [...history].reverse()) {
    if (!doc) continue;
    const bulletin = parseDailyBulletin(doc.text, doc.lastModified);
    if (!bulletin || seen.has(bulletin.date)) continue;
    seen.add(bulletin.date);
    parsed.push(bulletin);
  }
  if (current) {
    const bulletin = parseDailyBulletin(current.text, current.lastModified);
    if (bulletin && !seen.has(bulletin.date)) parsed.push(bulletin);
    else if (bulletin && seen.has(bulletin.date)) {
      const index = parsed.findIndex((item) => item.date === bulletin.date);
      if (index >= 0) parsed[index] = bulletin;
    }
  }
  return parsed;
}

async function goldOn(date: Ymd, hours: number[]) {
  const docs = await Promise.all(hours.map(async (hour) => ({ hour, doc: await getXml(goldUrl(date, hour)) })));
  return docs
    .flatMap(({ hour, doc }) => {
      const print = doc ? parseGoldBulletin(doc.text) : null;
      return print ? [{ hour, print }] : [];
    })
    .sort((a, b) => a.hour - b.hour)
    .map((item) => item.print);
}

async function loadGold(today: Ymd & { hour: number }) {
  const todayHours = today.hour >= 10 ? GOLD_HOURS.filter((hour) => hour <= today.hour) : [];
  const olderDates = previousWeekdays(today, 4).reverse();
  const [todayPrints, ...olderDays] = await Promise.all([
    todayHours.length ? goldOn(today, todayHours) : Promise.resolve([]),
    ...olderDates.map((date) => goldOn(date, [15, 11])),
  ]);
  const prints = olderDays.flatMap((day) => (day.length ? [day[day.length - 1]] : []));
  if (todayPrints.length) prints.push(todayPrints[todayPrints.length - 1]);
  return prints;
}

function emptyPayload(fetchedAt: string): MarketsPayload {
  return {
    ok: true,
    stale: false,
    fetchedAt,
    quotes: MARKET_IDS.map((id) => unavailableQuote(id, id === "gram" ? "gram" : id === "usd" || id === "eur" ? "fx" : id)),
  };
}

async function refreshFx(): Promise<FxCache | null> {
  const now = new Date();
  const today = istanbulNow(now);
  const [bulletins, gold] = await Promise.all([loadBulletins(today), loadGold(today)]);
  const hasFx = bulletins.length > 0;
  if (hasFx) {
    fxCache = { at: now.getTime(), bulletins, gold };
    fxNext = 0;
    return fxCache;
  }
  fxNext = now.getTime() + 30_000;
  if (fxCache && now.getTime() - fxCache.at < KEEP_MS) return fxCache;
  return null;
}

async function getFx(): Promise<{ cache: FxCache; stale: boolean } | null> {
  const now = Date.now();
  if (fxCache && now - fxCache.at < FRESH_MS) return { cache: fxCache, stale: false };
  if (now < fxNext) {
    if (fxCache && now - fxCache.at < KEEP_MS) return { cache: fxCache, stale: true };
    return null;
  }
  if (!fxInflight) {
    fxInflight = refreshFx().finally(() => {
      fxInflight = null;
    });
  }
  try {
    const cache = await fxInflight;
    if (!cache) return null;
    return { cache, stale: Date.now() - cache.at >= FRESH_MS };
  } catch {
    fxNext = Date.now() + 30_000;
    if (fxCache && now - fxCache.at < KEEP_MS) return { cache: fxCache, stale: true };
    return null;
  }
}

function keepSpot(previous: SpotSide, next: SpotPrint | null, now: number): SpotSide {
  if (next) return { print: next, at: now, stale: false };
  if (previous.print && now - previous.at < KEEP_MS) return { print: previous.print, at: previous.at, stale: true };
  return { print: null, at: now, stale: false };
}

async function fetchSpot(symbol: "XAU" | "BTC") {
  try {
    const res = await fetch(`https://api.gold-api.com/price/${symbol}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json", "User-Agent": "AlSatPortMarket/1.0" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 20_000) return null;
    return parseSpot(JSON.parse(text) as unknown, symbol, Date.now());
  } catch {
    return null;
  }
}

async function refreshSpots() {
  const now = Date.now();
  const [xau, btc] = await Promise.all([fetchSpot("XAU"), fetchSpot("BTC")]);
  xauSide = keepSpot(xauSide, xau, now);
  btcSide = keepSpot(btcSide, btc, now);
  spotNext = xau && btc ? 0 : now + SPOT_FRESH_MS;
}

async function getSpots() {
  const now = Date.now();
  const xauFresh = xauSide.print && now - xauSide.at < SPOT_FRESH_MS;
  const btcFresh = btcSide.print && now - btcSide.at < SPOT_FRESH_MS;
  if (xauFresh && btcFresh) return;
  if (now < spotNext) return;
  if (!spotInflight) {
    spotInflight = refreshSpots().finally(() => {
      spotInflight = null;
    });
  }
  try {
    await spotInflight;
  } catch {
    spotNext = Date.now() + SPOT_FRESH_MS;
  }
}

function applyFxStale(quote: MarketQuote, fxStale: boolean) {
  if (!fxStale || quote.status !== "ok") return quote;
  if (quote.id === "usd" || quote.id === "eur" || quote.estimate) return { ...quote, stale: true };
  return quote;
}

export async function getMarkets(): Promise<MarketsPayload> {
  const fetchedAt = new Date().toISOString();
  try {
    const [fx] = await Promise.all([getFx(), getSpots()]);
    const body = assembleMarkets({
      bulletins: fx?.cache.bulletins ?? [],
      gold: fx?.cache.gold ?? [],
      spotXau: xauSide.print,
      spotBtc: btcSide.print,
      xauStale: xauSide.stale,
      btcStale: btcSide.stale,
      fetchedAt,
    });
    if (!fx?.stale) return body;
    return {
      ...body,
      stale: true,
      quotes: body.quotes.map((quote) => applyFxStale(quote, true)),
    };
  } catch {
    return emptyPayload(fetchedAt);
  }
}
