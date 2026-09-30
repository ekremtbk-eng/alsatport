"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CURRENCIES, LOCALES } from "@/i18n/config";
import { useI18n } from "@/context/I18nContext";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, currency, setLocale, setCurrency, t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((l) => l.id === locale)!;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="lang-switch"
        aria-label={t("lang.label")}
        aria-expanded={open}
      >
        <span className="text-base leading-none">{current.flag}</span>
        {!compact && (
          <span className="hidden text-xs font-bold uppercase sm:inline">{locale}</span>
        )}
        <span className="hidden text-[10px] font-semibold text-lime sm:inline">{currency}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>
      {open && (
        <div className="lang-menu">
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted">
            {t("lang.label")}
          </p>
          {LOCALES.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`lang-item ${l.id === locale ? "is-on" : ""}`}
              onClick={() => {
                setLocale(l.id);
              }}
            >
              <span className="text-lg">{l.flag}</span>
              <span className="flex-1 text-start text-sm font-semibold">{l.native}</span>
              <span className="text-[10px] uppercase text-muted">{l.id}</span>
            </button>
          ))}
          <p className="px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted">
            {t("currency.label")}
          </p>
          <div className="grid grid-cols-4 gap-1 px-2 pb-2">
            {CURRENCIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`rounded-lg py-1.5 text-[11px] font-extrabold ${
                  c.id === currency ? "bg-lime/20 text-lime" : "bg-elev text-soft"
                }`}
                onClick={() => setCurrency(c.id)}
              >
                {c.id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
