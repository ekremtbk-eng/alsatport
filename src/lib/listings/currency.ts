/**
 * Currencies a listing price can be entered in. Prices are stored and shown in the listing's own currency;
 * there is no exchange-rate source, so nothing is ever converted or compared across currencies.
 */
export type ListingCurrency = "TRY" | "GBP" | "EUR" | "USD";

export const LISTING_CURRENCIES: { id: ListingCurrency; symbol: string; label: string }[] = [
  { id: "TRY", symbol: "₺", label: "Türk Lirası" },
  { id: "GBP", symbol: "£", label: "İngiliz Sterlini" },
  { id: "EUR", symbol: "€", label: "Euro" },
  { id: "USD", symbol: "$", label: "ABD Doları" },
];

const IDS = new Set<string>(LISTING_CURRENCIES.map((c) => c.id));

export function parseListingCurrency(value: unknown): ListingCurrency | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toUpperCase();
  return IDS.has(v) ? (v as ListingCurrency) : undefined;
}

/** Missing or unknown values are TRY, matching the column default for existing rows. */
export function listingCurrencyOf(value: unknown): ListingCurrency {
  return parseListingCurrency(value) ?? "TRY";
}

/** Price sorting groups listings by currency (TRY first) so amounts are only compared within one currency. */
export function currencyOrder(a: { currency?: string }, b: { currency?: string }) {
  const ids = LISTING_CURRENCIES.map((c) => c.id);
  return ids.indexOf(listingCurrencyOf(a.currency)) - ids.indexOf(listingCurrencyOf(b.currency));
}

export function listingCurrencySymbol(value: unknown) {
  const id = listingCurrencyOf(value);
  return LISTING_CURRENCIES.find((c) => c.id === id)!.symbol;
}
