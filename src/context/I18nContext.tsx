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
  formatMoney,
  localeMeta,
} from "@/i18n/config";
import { MESSAGES } from "@/i18n/messages";

type I18nState = {
  locale: Locale;
  /** Display currency of the selected language (Türkçe → TRY, English → USD); not separately selectable. */
  currency: Currency;
  dir: "ltr" | "rtl";
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  formatMoney: (amountTry: number) => string;
  inTurkeyHint: boolean;
  setInTurkeyHint: (v: boolean) => void;
};

const KEY = "alsatport-i18n-v1";
const Ctx = createContext<I18nState | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");
  const [inTurkeyHint, setInTurkeyHint] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.locale) setLocaleState(p.locale);
        if (typeof p.inTurkeyHint === "boolean") setInTurkeyHint(p.inTurkeyHint);
      } else {
        const nav = navigator.language?.toLowerCase() ?? "";
        setLocaleState(nav.startsWith("en") ? "en" : "tr");
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify({ locale, inTurkeyHint }));
    const meta = localeMeta(locale);
    document.documentElement.lang = meta.htmlLang;
    document.documentElement.dir = meta.dir;
  }, [locale, inTurkeyHint, hydrated]);

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

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    const meta = localeMeta(next);
    document.documentElement.lang = meta.htmlLang;
    document.documentElement.dir = meta.dir;
  }, []);

  const meta = localeMeta(locale);
  const currency = meta.defaultCurrency;
  const dir = meta.dir;

  const value = useMemo(
    () => ({
      locale,
      currency,
      dir,
      t,
      setLocale,
      formatMoney: (n: number) => formatMoney(n, locale),
      inTurkeyHint,
      setInTurkeyHint,
    }),
    [locale, currency, dir, t, setLocale, inTurkeyHint],
  );

  return (
    <Ctx.Provider value={value}>
      <div dir={dir} lang={meta.htmlLang} className={dir === "rtl" ? "rtl-root" : undefined}>
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
