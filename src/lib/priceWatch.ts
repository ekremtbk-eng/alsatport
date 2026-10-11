import { formatMoney } from "@/i18n/config";
import { listingCurrencyOf } from "@/lib/listings/currency";

/** Last seen price of a listing on this device; `currency` is missing for entries saved before it was tracked. */
export type WatchedPrice = { price: number; currency?: string };

type Priced = { price: number; currency?: string };

/** Reads the stored map; older versions kept bare numbers, whose currency is unknown. */
export function readWatchedPrices(raw: unknown): Record<string, WatchedPrice> {
  const out: Record<string, WatchedPrice> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      out[id] = { price: v };
    } else if (v && typeof v === "object" && Number.isFinite((v as WatchedPrice).price)) {
      const { price, currency } = v as WatchedPrice;
      out[id] = { price, currency: typeof currency === "string" ? currency : undefined };
    }
  }
  return out;
}

export function watchedPriceOf(listing: Priced): WatchedPrice {
  return { price: listing.price, currency: listingCurrencyOf(listing.currency) };
}

/**
 * A price drop is only reported within one known currency: amounts are never converted, so a currency change
 * (or an entry without a recorded currency) only becomes the new baseline.
 */
export function priceDropOf(prev: WatchedPrice | undefined, listing: Priced) {
  if (!prev?.currency) return null;
  const currency = listingCurrencyOf(listing.currency);
  if (listingCurrencyOf(prev.currency) !== currency || !(listing.price < prev.price)) return null;
  return { from: formatMoney(prev.price, "tr", currency), to: formatMoney(listing.price, "tr", currency) };
}
