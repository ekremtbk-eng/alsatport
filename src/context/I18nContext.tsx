"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CURRENCIES,
  type Currency,
  type Locale,
  convertFromTry,
  formatMoney,
  localeMeta,
} from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";

type I18nState = {
  locale: Locale;
  currency: Currency;
  currencyPinned: boolean;
  dir: "ltr" | "rtl";
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  formatMoney: (amountTry: number) => string;
  convertFromTry: (amountTry: number) => number;
  inTurkeyHint: boolean;
  setInTurkeyHint: (v: boolean) => void;
};

const KEY = "alsatport-i18n-v1";
const Ctx = createContext<I18nState | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");
  const [currency, setCurrencyState] = useState<Currency>("TRY");
  const [currencyPinned, setPinned] = useState(false);
  const [inTurkeyHint, setInTurkeyHint] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.locale) setLocaleState(p.locale);
        if (p.currency) setCurrencyState(p.currency);
        if (p.currencyPinned) setPinned(true);
        if (typeof p.inTurkeyHint === "boolean") setInTurkeyHint(p.inTurkeyHint);
      } else {
        const nav = navigator.language?.toLowerCase() ?? "";
        let loc: Locale = "tr";
        if (nav.startsWith("de")) loc = "de";
        else if (nav.startsWith("ar")) loc = "ar";
        else if (nav.startsWith("ru")) loc = "ru";
        else if (nav.startsWith("en")) loc = "en";
        setLocaleState(loc);
        setCurrencyState(localeMeta(loc).defaultCurrency);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      KEY,
      JSON.stringify({ locale, currency, currencyPinned, inTurkeyHint }),
    );
    const meta = localeMeta(locale);
    document.documentElement.lang = meta.htmlLang;
    document.documentElement.dir = meta.dir;
  }, [locale, currency, currencyPinned, inTurkeyHint, hydrated]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = MESSAGES[locale] ?? MESSAGES.tr;
      let s = dict[key] ?? MESSAGES.tr[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replaceAll(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [locale],
  );

  const applyDocument = useCallback((next: Locale) => {
    const meta = localeMeta(next);
    document.documentElement.lang = meta.htmlLang;
    document.documentElement.dir = meta.dir;
  }, []);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      applyDocument(next);
      setPinned((pinned) => {
        if (!pinned) setCurrencyState(localeMeta(next).defaultCurrency);
        return pinned;
      });
    },
    [applyDocument],
  );

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    setPinned(true);
  }, []);

  const dir = localeMeta(locale).dir;

  const value = useMemo(
    () => ({
      locale,
      currency,
      currencyPinned,
      dir,
      t,
      setLocale,
      setCurrency,
      formatMoney: (n: number) => formatMoney(n, currency, locale),
      convertFromTry: (n: number) => convertFromTry(n, currency),
      inTurkeyHint,
      setInTurkeyHint,
    }),
    [locale, currency, currencyPinned, dir, t, setLocale, setCurrency, inTurkeyHint],
  );

  return (
    <Ctx.Provider value={value}>
      <div dir={dir} lang={localeMeta(locale).htmlLang} className={dir === "rtl" ? "rtl-root" : undefined}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function catName(
  t: (key: string, vars?: Record<string, string | number>) => string,
  id: string,
  fallback?: string,
) {
  const key = `cat.${id}`;
  const v = t(key);
  return v === key ? (fallback ?? id) : v;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export { CURRENCIES };
