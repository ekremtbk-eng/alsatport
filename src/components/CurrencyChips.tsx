"use client";

import { useI18n } from "@/context/I18nContext";
import { LISTING_CURRENCIES } from "@/lib/listings/currency";

/** Currency scope of the price filter; prices are compared only within the chosen currency (no conversion). */
export function CurrencyChips({
  value,
  onChange,
  order,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Currency ids in display order; defaults to the listing currency order. */
  order?: string[];
}) {
  const { t } = useI18n();
  const currencies = order
    ? [...LISTING_CURRENCIES].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    : LISTING_CURRENCIES;
  const options = [{ id: "", label: t("loc.all") }, ...currencies.map((c) => ({ id: c.id, label: `${c.symbol} ${c.id}` }))];
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
