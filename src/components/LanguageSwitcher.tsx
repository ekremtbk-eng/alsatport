"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { MENU_LOCALES, currencySymbol, localeMeta } from "@/i18n/config";
import { useI18n } from "@/context/I18nContext";

export function LanguageSwitcher({
  compact = false,
  bar = false,
}: {
  compact?: boolean;
  bar?: boolean;
}) {
  const { locale, currency, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = localeMeta(locale);
  const symbol = currencySymbol(currency);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = (
    <>
      <span className="lang-pair-long">
        {current.native} · {symbol}
      </span>
      <span className="lang-pair-short">
        {locale.toUpperCase()} · {symbol}
      </span>
    </>
  );

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={bar ? "hdr-lang-pair" : `lang-switch ${compact ? "is-compact" : ""}`}
        aria-label={`${t("lang.pair")}: ${current.native} · ${symbol}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        {bar ? null : <span className="text-base leading-none">{current.flag}</span>}
        {label}
        <ChevronDown className="lang-switch-chevron h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <div id={menuId} className="lang-menu" role="menu" aria-label={t("lang.pair")}>
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted">{t("lang.pair")}</p>
          {MENU_LOCALES.map((id) => {
            const meta = localeMeta(id);
            const on = id === locale;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                className={`lang-item ${on ? "is-on" : ""}`}
                onClick={() => {
                  setLocale(id);
                  setOpen(false);
                }}
              >
                <span className="text-lg">{meta.flag}</span>
                <span className="flex-1 text-start text-sm font-semibold">
                  {meta.native} · {currencySymbol(meta.defaultCurrency)}
                </span>
                {on ? <Check className="h-4 w-4 text-lime" aria-hidden /> : null}
              </button>
            );
          })}
          {currency !== "TRY" ? <p className="lang-menu-note">{t("lang.priceNote")}</p> : null}
        </div>
      )}
    </div>
  );
}
