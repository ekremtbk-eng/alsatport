import assert from "node:assert/strict";
import { assembleMarkets, withStale } from "../src/lib/markets/assemble";
import { changePct, gramSpotTry, parseDailyBulletin, parseGoldBulletin, parseSpot, TROY_OUNCE_GRAMS } from "../src/lib/markets/parse";
import { normalizePayload } from "../src/lib/markets/view";

const daily = `<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="26.10.2026" Date="10/26/2026" Bulten_No="2026/202">
  <Currency CurrencyCode="USD"><Unit>1</Unit><Isim>&lt;script&gt;alert(1)&lt;/script&gt;</Isim>
    <ForexBuying>49.6732</ForexBuying><ForexSelling>49.7627</ForexSelling></Currency>
  <Currency CurrencyCode="EUR"><Unit>1</Unit>
    <ForexBuying>55.6539</ForexBuying><ForexSelling>55.7542</ForexSelling></Currency>
</Tarih_Date>`;

const previous = daily.replace("10/26/2026", "10/23/2026").replace("49.7627", "49.5000").replace("55.7542", "55.5000");
const today = parseDailyBulletin(daily, "Mon, 26 Oct 2026 12:30:02 GMT");
const prior = parseDailyBulletin(previous);
assert.ok(today && prior);
assert.equal(today.date, "2026-10-26");
assert.equal(today.usd.sell, 49.7627);
assert.equal(today.updatedAt, "2026-10-26T12:30:02.000Z");

const gold = `<?xml version="1.0"?><tcmbVeri><zaman_etiketi>2026-10-26T11:03:05+03:00</zaman_etiketi>
<kur><doviz_cinsi>XAU</doviz_cinsi><alis>5700,10</alis></kur>
<kur><doviz_cinsi>XAS</doviz_cinsi><alis>5763,52</alis></kur></tcmbVeri>`;
const olderGold = gold.replace("5763,52", "5700,00").replace("2026-10-26T11:03:05+03:00", "2026-10-23T11:03:05+03:00");
const gram = parseGoldBulletin(gold);
const gramOld = parseGoldBulletin(olderGold);
assert.ok(gram && gramOld);
assert.equal(gram.buy, 5763.52);
assert.equal(gram.purity, "xas");
assert.equal(parseGoldBulletin(gold.replace(/XAS[\s\S]*?<\/kur>/, "") )?.purity, "xau");
assert.equal(parseGoldBulletin("<tcmbVeri></tcmbVeri>"), null);
assert.equal(parseDailyBulletin("<Tarih_Date Date=\"10/26/2026\"></Tarih_Date>"), null);
assert.equal(changePct(49.7627, 49.5), 0.53);
assert.equal(changePct(80, 49.5), null);

const payload = assembleMarkets({
  bulletins: [prior, today],
  gold: [gramOld, gram],
  fetchedAt: "2026-10-26T16:00:00.000Z",
});
assert.equal(payload.quotes.length, 6);
assert.deepEqual(payload.quotes.map((quote) => quote.id), ["gram", "ceyrek", "usd", "eur", "bist", "btc"]);
const usd = payload.quotes.find((quote) => quote.id === "usd");
const eur = payload.quotes.find((quote) => quote.id === "eur");
const metal = payload.quotes.find((quote) => quote.id === "gram");
assert.equal(usd?.status, "ok");
assert.equal(usd?.price, 49.7627);
assert.equal(usd?.buy, 49.6732);
assert.equal(usd?.sell, 49.7627);
assert.equal(usd?.source, "tcmb");
assert.equal(usd?.delay, "daily");
assert.ok(usd?.series && usd.series.length === 2);
assert.equal(eur?.price, 55.7542);
assert.equal(metal?.price, 5763.52);
assert.equal(metal?.sell, null);
assert.equal(metal?.purity, "xas");
assert.equal(metal?.source, "tcmb-gold");
assert.equal(metal?.estimate, false);
for (const id of ["ceyrek", "bist", "btc"] as const) {
  const quote = payload.quotes.find((item) => item.id === id);
  assert.equal(quote?.status, "unavailable");
  assert.equal(quote?.price, null);
  assert.equal(quote?.reason, id);
}
const dumped = JSON.stringify(payload);
assert.equal(dumped.includes("<script>"), false);
assert.equal(dumped.includes("alert"), false);

const empty = assembleMarkets({ bulletins: [], gold: [] });
assert.equal(empty.quotes.every((quote) => quote.price == null), true);
assert.equal(empty.quotes.find((quote) => quote.id === "usd")?.reason, "fx");
assert.equal(empty.quotes.find((quote) => quote.id === "gram")?.reason, "gram");

const poisoned = normalizePayload({
  ok: true,
  fetchedAt: "2026-10-26T16:00:00.000Z",
  quotes: [
    { id: "usd", status: "ok", price: "49.76<script>", buy: 1, sell: 1, source: "tcmb", delay: "daily", series: [1, "x"] },
    { id: "eur", status: "unavailable", price: 12, reason: "fx" },
    { id: "bist", status: "ok", price: 999999, reason: "ignored" },
  ],
});
assert.ok(poisoned);
assert.equal(poisoned.quotes.find((quote) => quote.id === "usd")?.status, "unavailable");
assert.equal(poisoned.quotes.find((quote) => quote.id === "bist")?.status, "unavailable");
assert.equal(poisoned.quotes.find((quote) => quote.id === "bist")?.price, null);
assert.equal(poisoned.quotes.find((quote) => quote.id === "eur")?.price, null);
assert.equal(poisoned.quotes.find((quote) => quote.id === "ceyrek")?.reason, "ceyrek");
assert.equal(JSON.stringify(poisoned).includes("script"), false);
const kept = normalizePayload(payload);
assert.equal(kept?.quotes.find((quote) => quote.id === "usd")?.price, 49.7627);
assert.equal(normalizePayload({ quotes: [] }), null);
assert.equal(normalizePayload(null), null);

const stale = withStale(payload);
assert.equal(stale.stale, true);
assert.equal(stale.quotes.find((quote) => quote.id === "usd")?.price, 49.7627);
assert.equal(stale.quotes.find((quote) => quote.id === "usd")?.stale, true);
assert.equal(stale.quotes.find((quote) => quote.id === "bist")?.price, null);
assert.equal(stale.quotes.find((quote) => quote.id === "bist")?.stale, false);
assert.equal(stale.fetchedAt, payload.fetchedAt);

const spotAt = "2026-10-26T20:04:46.000Z";
const spotNow = Date.parse(spotAt);
assert.equal(parseSpot({ name: "<script>", symbol: "XAU", currency: "USD", price: 3110.34768, updatedAt: spotAt }, "XAU", spotNow)?.price, 3110.34768);
assert.equal(parseSpot({ symbol: "BTC", currency: "USD", price: 3110.34768, updatedAt: spotAt }, "XAU", spotNow), null);
assert.equal(parseSpot({ symbol: "XAU", currency: "EUR", price: 3110.34768, updatedAt: spotAt }, "XAU", spotNow), null);
assert.equal(parseSpot({ symbol: "XAU", currency: "USD", price: 3110.34768, updatedAt: "2026-10-26T10:00:00.000Z" }, "XAU", spotNow), null);
assert.equal(gramSpotTry(TROY_OUNCE_GRAMS * 100, 50, 50), 5000);
assert.equal(gramSpotTry(4013.199951, 49.6732, 49.7627), 6414.98);

const estimated = assembleMarkets({
  bulletins: [today],
  gold: [],
  spotXau: { symbol: "XAU", price: TROY_OUNCE_GRAMS * 100, updatedAt: spotAt },
  spotBtc: { symbol: "BTC", price: 79895.210938, updatedAt: "2026-10-26T20:04:18.000Z" },
  fetchedAt: "2026-10-26T20:05:00.000Z",
});
const gramEstimate = estimated.quotes.find((quote) => quote.id === "gram");
const btc = estimated.quotes.find((quote) => quote.id === "btc");
assert.equal(gramEstimate?.status, "ok");
assert.equal(gramEstimate?.estimate, true);
assert.equal(gramEstimate?.price, gramSpotTry(TROY_OUNCE_GRAMS * 100, today.usd.buy, today.usd.sell));
assert.equal(gramEstimate?.price, 4971.8);
assert.equal(gramEstimate?.buy, null);
assert.equal(gramEstimate?.sell, null);
assert.equal(gramEstimate?.changePct, null);
assert.equal(gramEstimate?.source, "gold-api");
assert.equal(gramEstimate?.updatedAt, spotAt);
assert.equal(gramEstimate?.fxUpdatedAt, today.updatedAt);
assert.equal(btc?.status, "ok");
assert.equal(btc?.price, 79895.21);
assert.equal(btc?.source, "gold-api");
assert.equal(btc?.changePct, null);
assert.equal(btc?.buy, null);
assert.equal(estimated.quotes.find((quote) => quote.id === "usd")?.price, 49.7627);
assert.equal(estimated.quotes.find((quote) => quote.id === "usd")?.source, "tcmb");
assert.equal(estimated.quotes.find((quote) => quote.id === "ceyrek")?.status, "unavailable");
assert.equal(estimated.quotes.find((quote) => quote.id === "bist")?.status, "unavailable");
assert.equal(JSON.stringify(estimated).includes("script"), false);

const noRate = assembleMarkets({
  bulletins: [],
  gold: [],
  spotXau: { symbol: "XAU", price: 4013.199951, updatedAt: spotAt },
  spotBtc: { symbol: "BTC", price: 79895.21, updatedAt: spotAt },
});
assert.equal(noRate.quotes.find((quote) => quote.id === "gram")?.status, "unavailable");
assert.equal(noRate.quotes.find((quote) => quote.id === "gram")?.price, null);
assert.equal(noRate.quotes.find((quote) => quote.id === "btc")?.price, 79895.21);

const officialWins = assembleMarkets({
  bulletins: [today],
  gold: [gram],
  spotXau: { symbol: "XAU", price: TROY_OUNCE_GRAMS * 100, updatedAt: spotAt },
});
assert.equal(officialWins.quotes.find((quote) => quote.id === "gram")?.source, "tcmb-gold");
assert.equal(officialWins.quotes.find((quote) => quote.id === "gram")?.estimate, false);
assert.equal(officialWins.quotes.find((quote) => quote.id === "gram")?.price, 5763.52);

const live = normalizePayload(estimated);
assert.equal(live?.quotes.find((quote) => quote.id === "btc")?.price, 79895.21);
assert.equal(live?.quotes.find((quote) => quote.id === "gram")?.estimate, true);
assert.equal(live?.quotes.find((quote) => quote.id === "gram")?.buy, null);
const dealer = normalizePayload({
  fetchedAt: spotAt,
  quotes: [{
    id: "gram",
    status: "ok",
    price: 6400,
    buy: 6300,
    sell: 6500,
    source: "gold-api",
    delay: "spot",
    updatedAt: spotAt,
    fxUpdatedAt: today.updatedAt,
    changePct: 1.2,
  }],
});
assert.equal(dealer?.quotes.find((quote) => quote.id === "gram")?.buy, null);
assert.equal(dealer?.quotes.find((quote) => quote.id === "gram")?.sell, null);
assert.equal(dealer?.quotes.find((quote) => quote.id === "gram")?.changePct, null);
assert.equal(normalizePayload({
  fetchedAt: spotAt,
  quotes: [{ id: "gram", status: "ok", price: 6400, source: "gold-api", delay: "spot", updatedAt: spotAt }],
})?.quotes.find((quote) => quote.id === "gram")?.status, "unavailable");
assert.equal(normalizePayload({
  fetchedAt: spotAt,
  quotes: [{ id: "usd", status: "ok", price: 40, source: "gold-api", delay: "spot", updatedAt: spotAt }],
})?.quotes.find((quote) => quote.id === "usd")?.status, "unavailable");

console.log("market tests passed");
