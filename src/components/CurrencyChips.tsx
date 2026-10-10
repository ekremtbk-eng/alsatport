"use client";

import { useI18n } from "@/context/I18nContext";
import { LISTING_CURRENCIES } from "@/lib/listings/currency";

/** Currency scope of the price filter; prices are compared only within the chosen currency (no conversion). */
export function CurrencyChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const options = [{ id: "", label: t("loc.all") }, ...LISTING_CURRENCIES.map((c) => ({ id: c.id, label: `${c.symbol} ${c.id}` }))];
  return (
    <div className="flt-presets currency-chips" role="radiogroup" aria-label={t("cur.label")}>
      {options.map((o) => {
        const on = (value || "") === o.id;
        return (
          <button
            key={o.id || "all"}
            type="button"
            role="radio"
            aria-checked={on}
            className={`flt-preset ${on ? "is-on" : ""}`}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
