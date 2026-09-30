export type Locale = "tr" | "en" | "de" | "ar" | "ru";
export type Currency = "TRY" | "USD" | "EUR" | "GBP";
export type PayMethodId = "iyzico" | "paytr" | "stripe" | "paypal" | "crypto";

export const LOCALES: {
  id: Locale;
  name: string;
  native: string;
  flag: string;
  dir: "ltr" | "rtl";
  htmlLang: string;
  defaultCurrency: Currency;
}[] = [
  { id: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷", dir: "ltr", htmlLang: "tr", defaultCurrency: "TRY" },
  { id: "en", name: "English", native: "English", flag: "🇬🇧", dir: "ltr", htmlLang: "en", defaultCurrency: "USD" },
  { id: "de", name: "German", native: "Deutsch", flag: "🇩🇪", dir: "ltr", htmlLang: "de", defaultCurrency: "EUR" },
  { id: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦", dir: "rtl", htmlLang: "ar", defaultCurrency: "USD" },
  { id: "ru", name: "Russian", native: "Русский", flag: "🇷🇺", dir: "ltr", htmlLang: "ru", defaultCurrency: "EUR" },
];

export const CURRENCIES: { id: Currency; symbol: string; label: string }[] = [
  { id: "TRY", symbol: "₺", label: "Türk Lirası" },
  { id: "USD", symbol: "$", label: "US Dollar" },
  { id: "EUR", symbol: "€", label: "Euro" },
  { id: "GBP", symbol: "£", label: "British Pound" },
];

/** TRY → other (indicative mid-market, refreshed in-app). */
export const FX_FROM_TRY: Record<Currency, number> = {
  TRY: 1,
  USD: 1 / 41.25,
  EUR: 1 / 44.8,
  GBP: 1 / 52.4,
};

export const NUMBER_LOCALE: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ar: "ar-SA",
  ru: "ru-RU",
};

export function localeMeta(id: Locale) {
  return LOCALES.find((l) => l.id === id) ?? LOCALES[0];
}

export function convertFromTry(amountTry: number, currency: Currency) {
  return amountTry * FX_FROM_TRY[currency];
}

export function formatMoney(amountTry: number, currency: Currency, locale: Locale) {
  const value = convertFromTry(amountTry, currency);
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "TRY" ? 0 : 2,
  }).format(value);
}

export const PAY_METHODS: {
  id: PayMethodId;
  currencies: Currency[];
  turkeyOnly?: boolean;
}[] = [
  { id: "iyzico", currencies: ["TRY"], turkeyOnly: true },
  { id: "paytr", currencies: ["TRY"], turkeyOnly: true },
  { id: "stripe", currencies: ["TRY", "USD", "EUR", "GBP"] },
  { id: "paypal", currencies: ["USD", "EUR", "GBP"] },
  { id: "crypto", currencies: ["TRY", "USD", "EUR", "GBP"] },
];

export function isMethodActive(
  id: PayMethodId,
  currency: Currency,
  inTurkey: boolean,
) {
  if (id !== "paytr") return false;
  const m = PAY_METHODS.find((x) => x.id === id);
  if (!m) return false;
  if (m.turkeyOnly && !inTurkey && currency !== "TRY") return false;
  if (m.turkeyOnly && currency !== "TRY") return false;
  return m.currencies.includes(currency);
}
