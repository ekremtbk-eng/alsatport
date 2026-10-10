"use client";

import { useI18n } from "@/context/I18nContext";
import { COUNTRIES, type Country } from "@/data/locations";

/** "Tümü / Türkiye / KKTC" segmented control; value is the URL form (`""`, `tr`, `kktc`). */
export function CountrySwitch({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const options: { id: string; label: string }[] = [
    { id: "", label: t("loc.all") },
    ...COUNTRIES.map((c: { id: Country; labelKey: string; urlValue: string }) => ({ id: c.urlValue, label: t(c.labelKey) })),
  ];
  return (
    <div className={`country-switch ${className}`} role="radiogroup" aria-label={t("loc.country")}>
      {options.map((o) => {
        const on = (value || "") === o.id;
        return (
          <button
            key={o.id || "all"}
            type="button"
            role="radio"
            aria-checked={on}
            className={on ? "is-on" : ""}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
