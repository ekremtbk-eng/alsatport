export const MARKET_IDS = ["gram", "ceyrek", "usd", "eur", "bist", "btc"] as const;

export type MarketId = (typeof MARKET_IDS)[number];
export type MarketReason = "ceyrek" | "bist" | "btc" | "gram" | "fx";
export type MarketSource = "tcmb" | "tcmb-gold" | "gold-api";
export type MarketDelay = "daily" | "gold" | "spot";
export type GoldPurity = "xas" | "xau";

export type MarketQuote = {
  id: MarketId;
  status: "ok" | "unavailable";
  price: number | null;
  buy: number | null;
  sell: number | null;
  changePct: number | null;
  updatedAt: string | null;
  source: MarketSource | null;
  delay: MarketDelay | null;
  reason: MarketReason | null;
  series: number[] | null;
  stale: boolean;
  purity: GoldPurity | null;
  estimate: boolean;
  fxUpdatedAt: string | null;
};

export type MarketsPayload = {
  ok: true;
  stale: boolean;
  fetchedAt: string;
  quotes: MarketQuote[];
};

export function unavailableQuote(id: MarketId, reason: MarketReason): MarketQuote {
  return {
    id,
    status: "unavailable",
    price: null,
    buy: null,
    sell: null,
    changePct: null,
    updatedAt: null,
    source: null,
    delay: null,
    reason,
    series: null,
    stale: false,
    purity: null,
    estimate: false,
    fxUpdatedAt: null,
  };
}
