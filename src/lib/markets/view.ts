import { MARKET_IDS, unavailableQuote, type MarketId, type MarketQuote, type MarketReason, type MarketsPayload } from "@/lib/markets/types";

const REASONS = new Set<MarketReason>(["ceyrek", "bist", "btc", "gram", "fx"]);
const PRICED = new Set<MarketId>(["gram", "usd", "eur", "btc"]);

function numberIn(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function reasonFor(id: MarketId): MarketReason {
  if (id === "usd" || id === "eur") return "fx";
  return id;
}

function sourceFits(id: MarketId, source: MarketQuote["source"]) {
  if (id === "usd" || id === "eur") return source === "tcmb";
  if (id === "gram") return source === "tcmb-gold" || source === "gold-api";
  if (id === "btc") return source === "gold-api";
  return false;
}

function quoteFrom(row: Record<string, unknown>): MarketQuote | null {
  if (!MARKET_IDS.includes(row.id as MarketId)) return null;
  const id = row.id as MarketId;
  const price = numberIn(row.price, 0.0001, 1_000_000_000);
  const ok = PRICED.has(id) && row.status === "ok" && price != null;
  if (!ok) return { ...unavailableQuote(id, REASONS.has(row.reason as MarketReason) ? (row.reason as MarketReason) : reasonFor(id)), stale: row.stale === true };
  const source = row.source === "tcmb" || row.source === "tcmb-gold" || row.source === "gold-api" ? row.source : null;
  const delay = row.delay === "daily" || row.delay === "gold" || row.delay === "spot" ? row.delay : null;
  const updatedAt = typeof row.updatedAt === "string" && !Number.isNaN(Date.parse(row.updatedAt)) ? new Date(row.updatedAt).toISOString() : null;
  const estimate = id === "gram" && source === "gold-api";
  const fxUpdatedAt = estimate && typeof row.fxUpdatedAt === "string" && !Number.isNaN(Date.parse(row.fxUpdatedAt))
    ? new Date(row.fxUpdatedAt).toISOString()
    : null;
  if (!source || !delay || !updatedAt || !sourceFits(id, source) || (estimate && !fxUpdatedAt)) {
    return { ...unavailableQuote(id, reasonFor(id)), stale: row.stale === true };
  }
  const fromApi = source === "gold-api";
  const series = Array.isArray(row.series)
    ? row.series.filter((item): item is number => typeof item === "number" && Number.isFinite(item) && item > 0).slice(0, 8)
    : [];
  return {
    id,
    status: "ok",
    price,
    buy: fromApi ? null : numberIn(row.buy, 0.0001, 1_000_000_000),
    sell: fromApi ? null : numberIn(row.sell, 0.0001, 1_000_000_000),
    changePct: fromApi ? null : numberIn(row.changePct, -25, 25),
    updatedAt,
    source,
    delay,
    reason: null,
    series: fromApi || series.length < 2 ? null : series,
    stale: row.stale === true,
    purity: fromApi ? null : row.purity === "xas" || row.purity === "xau" ? row.purity : null,
    estimate,
    fxUpdatedAt,
  };
}

export function normalizePayload(raw: unknown): MarketsPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as { quotes?: unknown; stale?: unknown; fetchedAt?: unknown };
  if (!Array.isArray(body.quotes)) return null;
  const byId = new Map<MarketId, MarketQuote>();
  for (const item of body.quotes) {
    if (!item || typeof item !== "object") continue;
    const quote = quoteFrom(item as Record<string, unknown>);
    if (quote) byId.set(quote.id, quote);
  }
  if (!byId.size) return null;
  const fetchedAt = typeof body.fetchedAt === "string" && !Number.isNaN(Date.parse(body.fetchedAt)) ? body.fetchedAt : new Date().toISOString();
  return {
    ok: true,
    stale: body.stale === true,
    fetchedAt,
    quotes: MARKET_IDS.map((id) => byId.get(id) ?? unavailableQuote(id, reasonFor(id))),
  };
}

export function priceDigits(id: MarketId) {
  return id === "usd" || id === "eur" ? 4 : 2;
}

export function priceSuffix(id: MarketId) {
  if (id === "bist") return "";
  if (id === "btc") return "USD";
  return "₺";
}

export function formatAmount(value: number, digits: number, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatWhen(iso: string | null, locale: string) {
  if (!iso || Number.isNaN(Date.parse(iso))) return "";
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : locale, {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatPct(value: number, locale: string) {
  const text = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  }).format(value);
  return `${text}%`;
}
