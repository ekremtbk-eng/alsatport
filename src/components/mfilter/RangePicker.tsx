"use client";

import { CurrencyChips } from "@/components/CurrencyChips";
import { useI18n } from "@/context/I18nContext";
import { rangeSuffix, type FilterField, type FilterState } from "@/lib/categoryFilters";
import { compactAmount, RANGE_BUCKETS } from "@/lib/mobileFilters";

const digits = (v: string) => v.replace(/[^\d]/g, "");

/** Year-like ranges are shown raw; amounts get thousand separators. */
function grouped(key: string) {
  return !key.startsWith("year");
}

export function rangeLabel(
  key: string,
  min: string,
  max: string,
  suffix: string,
  locale: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  const show = (v: string) => {
    const n = Number(v);
    const body = grouped(key) ? compactAmount(n, locale) : v;
    return suffix ? `${body} ${suffix}` : body;
  };
  if (min && max) return `${show(min)} – ${show(max)}`;
  if (min) return t("mf.atLeast", { n: show(min) });
  if (max) return t("mf.atMost", { n: show(max) });
  return "";
}

/** Min/max inputs with ready-made ranges; price also gets the currency switch. */
export function RangePicker({
  minField,
  maxField,
  state,
  onSet,
}: {
  minField: FilterField;
  maxField: FilterField;
  state: FilterState;
  onSet: (pairs: [string, string][]) => void;
}) {
  const { t, locale } = useI18n();
  const isPrice = minField.key === "priceMin";
  const suffix = rangeSuffix(minField, state) ?? "";
  const min = state[minField.key] ?? "";
  const max = state[maxField.key] ?? "";
  const bad = Boolean(min && max && Number(min) > Number(max));
  const show = (v: string) => (v && grouped(minField.key) ? Number(v).toLocaleString("tr-TR") : v);
  const buckets = RANGE_BUCKETS[minField.key] ?? [];
  const minId = `qf-${minField.key}`;
  const maxId = `qf-${maxField.key}`;

  return (
    <div className="qf-range">
      {isPrice ? (
        <div className="qf-block">
          <p className="qf-block-title">{t("cur.label")}</p>
          <CurrencyChips value={state.currency ?? ""} onChange={(v) => onSet([["currency", v]])} />
        </div>
      ) : null}
      <div className="qf-range-inputs">
        <label htmlFor={minId} className="qf-field">
          <span className="qf-field-label">{t("flt.min")}</span>
          <span className="qf-field-box">
            <input
              id={minId}
              inputMode="numeric"
              enterKeyHint="done"
              autoComplete="off"
              aria-invalid={bad || undefined}
              value={show(min)}
              placeholder={t("flt.min")}
              onChange={(e) => onSet([[minField.key, digits(e.target.value)]])}
            />
            {suffix ? <span className="qf-field-suffix">{suffix}</span> : null}
          </span>
        </label>
        <span className="qf-range-sep" aria-hidden>
          –
        </span>
        <label htmlFor={maxId} className="qf-field">
          <span className="qf-field-label">{t("flt.max")}</span>
          <span className="qf-field-box">
            <input
              id={maxId}
              inputMode="numeric"
              enterKeyHint="done"
              autoComplete="off"
              aria-invalid={bad || undefined}
              value={show(max)}
              placeholder={t("flt.max")}
              onChange={(e) => onSet([[maxField.key, digits(e.target.value)]])}
            />
            {suffix ? <span className="qf-field-suffix">{suffix}</span> : null}
          </span>
        </label>
      </div>
      {bad ? (
        <p className="qf-warn" role="alert">
          {t("mf.minGtMax")}
        </p>
      ) : null}
      {buckets.length > 0 ? (
        <div className="qf-block">
          <p className="qf-block-title">{t("mf.popular")}</p>
          <div className="qf-buckets">
            {buckets.map(([a, b]) => {
              const on = min === a && max === b;
              return (
                <button
                  key={`${a}-${b}`}
                  type="button"
                  aria-pressed={on}
                  className={`qf-bucket ${on ? "is-on" : ""}`}
                  onClick={() =>
                    onSet(
                      on
                        ? [
                            [minField.key, ""],
                            [maxField.key, ""],
                          ]
                        : [
                            [minField.key, a],
                            [maxField.key, b],
                          ],
                    )
                  }
                >
                  {rangeLabel(minField.key, a, b, suffix, locale, t)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {isPrice ? (
        <p className="qf-note">
          {state.currency || min || max ? t("cur.priceIn", { c: state.currency || "TRY" }) : t("cur.note")}
        </p>
      ) : null}
    </div>
  );
}
