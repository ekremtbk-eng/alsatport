import { changePct, gramSpotTry, type DailyBulletin, type GoldPrint, type SpotPrint } from "@/lib/markets/parse";
import { MARKET_IDS, unavailableQuote, type MarketQuote, type MarketsPayload } from "@/lib/markets/types";

function seriesFrom(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0).slice(-8);
  return clean.length >= 2 ? clean : null;
}

function fxQuote(id: "usd" | "eur", bulletins: DailyBulletin[]): MarketQuote {
  const newest = bulletins[bulletins.length - 1];
  if (!newest) return unavailableQuote(id, "fx");
  const side = newest[id];
  const older = bulletins.length > 1 ? bulletins[bulletins.length - 2][id].sell : null;
  return {
    id,
    status: "ok",
    price: side.sell,
    buy: side.buy,
    sell: side.sell,
    changePct: changePct(side.sell, older),
    updatedAt: newest.updatedAt,
    source: "tcmb",
    delay: "daily",
    reason: null,
    series: seriesFrom(bulletins.map((item) => item[id].sell)),
    stale: false,
    purity: null,
    estimate: false,
    fxUpdatedAt: null,
  };
}

function goldQuote(prints: GoldPrint[]): MarketQuote {
  const newest = prints[prints.length - 1];
  if (!newest) return unavailableQuote("gram", "gram");
  const older = prints.length > 1 ? prints[prints.length - 2].buy : null;
  return {
    id: "gram",
    status: "ok",
    price: newest.buy,
    buy: newest.buy,
    sell: null,
    changePct: changePct(newest.buy, older),
    updatedAt: newest.updatedAt,
    source: "tcmb-gold",
    delay: "gold",
    reason: null,
    series: seriesFrom(prints.map((item) => item.buy)),
    stale: false,
    purity: newest.purity,
    estimate: false,
    fxUpdatedAt: null,
  };
}

function gramQuote(prints: GoldPrint[], bulletins: DailyBulletin[], spot: SpotPrint | null, stale: boolean): MarketQuote {
  const official = goldQuote(prints);
  if (official.status === "ok") return official;
  const bulletin = bulletins[bulletins.length - 1];
  if (!spot || !bulletin) return unavailableQuote("gram", "gram");
  const price = gramSpotTry(spot.price, bulletin.usd.buy, bulletin.usd.sell);
  if (price == null) return unavailableQuote("gram", "gram");
  return {
    id: "gram",
    status: "ok",
    price,
    buy: null,
    sell: null,
    changePct: null,
    updatedAt: spot.updatedAt,
    source: "gold-api",
    delay: "spot",
    reason: null,
    series: null,
    stale,
    purity: null,
    estimate: true,
    fxUpdatedAt: bulletin.updatedAt,
  };
}

function btcQuote(spot: SpotPrint | null, stale: boolean): MarketQuote {
  if (!spot) return unavailableQuote("btc", "btc");
  return {
    id: "btc",
    status: "ok",
    price: Math.round(spot.price * 100) / 100,
    buy: null,
    sell: null,
    changePct: null,
    updatedAt: spot.updatedAt,
    source: "gold-api",
    delay: "spot",
    reason: null,
    series: null,
    stale,
    purity: null,
    estimate: false,
    fxUpdatedAt: null,
  };
}

export function withStale(body: MarketsPayload): MarketsPayload {
  return {
    ...body,
    stale: true,
    quotes: body.quotes.map((quote) => ({ ...quote, stale: quote.status === "ok" })),
  };
}

export function assembleMarkets(input: {
  bulletins: DailyBulletin[];
  gold: GoldPrint[];
  spotXau?: SpotPrint | null;
  spotBtc?: SpotPrint | null;
  xauStale?: boolean;
  btcStale?: boolean;
  fetchedAt?: string;
}): MarketsPayload {
  const bulletins = [...input.bulletins].sort((a, b) => a.date.localeCompare(b.date));
  const usd = fxQuote("usd", bulletins);
  const eur = fxQuote("eur", bulletins);
  const byId = new Map<MarketQuote["id"], MarketQuote>([
    ["gram", gramQuote(input.gold, bulletins, input.spotXau ?? null, input.xauStale === true)],
    ["ceyrek", unavailableQuote("ceyrek", "ceyrek")],
    ["usd", usd],
    ["eur", eur],
    ["bist", unavailableQuote("bist", "bist")],
    ["btc", btcQuote(input.spotBtc ?? null, input.btcStale === true)],
  ]);
  return {
    ok: true,
    stale: false,
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    quotes: MARKET_IDS.map((id) => byId.get(id) ?? unavailableQuote(id, "fx")),
  };
}
