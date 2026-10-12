"use client";

import { Check, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/context/I18nContext";

function fold(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
}

/**
 * Full-height option list for one filter: optional search box, an "any" choice and the options.
 * Single mode reports the picked value (the caller usually goes back); multi mode toggles values in place.
 */
export function OptionPicker({
  label,
  options,
  value,
  multi,
  counts,
  hideEmpty,
  anyLabel,
  lockedHint,
  searchable,
  onPick,
}: {
  label: string;
  options: string[];
  value: string;
  multi?: boolean;
  counts?: Record<string, number>;
  /** Hide options with a zero count (the selected ones always stay). */
  hideEmpty?: boolean;
  anyLabel: string;
  /** Shown instead of the list when a parent filter must be chosen first. */
  lockedHint?: string;
  searchable?: boolean;
  onPick: (value: string) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value.split(",").filter(Boolean)), [value]);
  const visible = useMemo(() => {
    const q = fold(query.trim());
    return options.filter((o) => {
      if (hideEmpty && counts && !selected.has(o) && (counts[o] ?? 0) === 0) return false;
      return !q || fold(o).includes(q);
    });
  }, [options, query, counts, hideEmpty, selected]);

  if (lockedHint) return <p className="qf-empty">{lockedHint}</p>;

  const toggle = (o: string) => {
    if (!multi) return onPick(o);
    const next = new Set(selected);
    if (next.has(o)) next.delete(o);
    else next.add(o);
    onPick([...next].join(","));
  };

  return (
    <div className="qf-picker">
      {searchable ?? options.length > 8 ? (
        <label className="qf-search">
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="sr-only">{t("mf.search", { label })}</span>
          <input
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            placeholder={t("mf.search", { label })}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      ) : null}
      <div role={multi ? "group" : "radiogroup"} aria-label={label} className="qf-opts">
        {!query ? (
          <button
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={selected.size === 0}
            className={`qf-opt ${selected.size === 0 ? "is-on" : ""}`}
            onClick={() => onPick("")}
          >
            <span className={multi ? "qf-check" : "qf-radio"} aria-hidden>
              {multi && selected.size === 0 ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
            <span className="qf-opt-name">{anyLabel}</span>
          </button>
        ) : null}
        {visible.map((o) => {
          const on = selected.has(o);
          return (
            <button
              key={o}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={on}
              className={`qf-opt ${on ? "is-on" : ""}`}
              onClick={() => toggle(o)}
            >
              <span className={multi ? "qf-check" : "qf-radio"} aria-hidden>
                {multi && on ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
              <span className="qf-opt-name">{o}</span>
              {counts ? <span className="qf-opt-count">{(counts[o] ?? 0).toLocaleString("tr-TR")}</span> : null}
            </button>
          );
        })}
        {visible.length === 0 ? <p className="qf-empty">{t("mf.noMatch")}</p> : null}
      </div>
    </div>
  );
}
