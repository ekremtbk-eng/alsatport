"use client";

import { useEffect, useRef, useState } from "react";
import { CurrencyChips } from "@/components/CurrencyChips";
import { useI18n } from "@/context/I18nContext";
import { rangeSuffix, type FilterField, type FilterState } from "@/lib/categoryFilters";
import { compactAmount } from "@/lib/mobileFilters";

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

function niceStep(raw: number) {
  const pow = 10 ** Math.floor(Math.log10(raw));
  const m = raw / pow;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
}

/**
 * Two-thumb slider over 0…top (the highest preset bound). A thumb at either end means "no limit", so dragging
 * never invents a bound the user did not ask for. Values are committed shortly after the thumb stops.
 */
function RangeSlider({
  top,
  min,
  max,
  label,
  format,
  onCommit,
}: {
  top: number;
  min: string;
  max: string;
  label: string;
  format: (n: number) => string;
  onCommit: (min: string, max: string) => void;
}) {
  const { t } = useI18n();
  const step = niceStep(top / 60);
  const clamp = (v: string, fallback: number) => (v ? Math.min(Math.max(Number(v), 0), top) : fallback);
  const [lo, setLo] = useState(() => clamp(min, 0));
  const [hi, setHi] = useState(() => clamp(max, top));
  const timer = useRef(0);
  useEffect(() => {
    window.clearTimeout(timer.current);
    setLo(min ? Math.min(Math.max(Number(min), 0), top) : 0);
    setHi(max ? Math.min(Math.max(Number(max), 0), top) : top);
  }, [min, max, top]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const schedule = (nextLo: number, nextHi: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onCommit(nextLo > 0 ? String(nextLo) : "", nextHi < top ? String(nextHi) : ""), 250);
  };
  const text = (v: number, end: boolean) => (end && v >= top ? `${format(top)}+` : format(v));

  return (
    <div className="qf-block">
      <div className="qf-slider" role="group" aria-label={t("mf.slider", { label })}>
        <span className="qf-slider-track" aria-hidden />
        <span className="qf-slider-fill" aria-hidden style={{ left: `${(lo / top) * 100}%`, right: `${100 - (hi / top) * 100}%` }} />
        <input
          type="range"
          min={0}
          max={top}
          step={step}
          value={lo}
          aria-label={t("flt.min")}
          aria-valuetext={text(lo, false)}
          onChange={(e) => {
            const v = Math.max(Math.min(Number(e.target.value), hi - step), 0);
            setLo(v);
            schedule(v, hi);
          }}
        />
        <input
          type="range"
          min={0}
          max={top}
          step={step}
          value={hi}
          aria-label={t("flt.max")}
          aria-valuetext={text(hi, true)}
          onChange={(e) => {
            const v = Math.min(Math.max(Number(e.target.value), lo + step), top);
            setHi(v);
            schedule(lo, v);
          }}
        />
      </div>
      <div className="qf-slider-ends" aria-hidden>
        <span>{text(lo, false)}</span>
        <span>{text(hi, true)}</span>
      </div>
    </div>
  );
}

/** Mobile currency order (most used first); desktop keeps the shared listing currency order. */
const PHONE_CURRENCIES = ["TRY", "USD", "EUR", "GBP"];

/** Min/max inputs with ready-made ranges; price also gets the currency switch. */
export function RangePicker({
  minField,
  maxField,
  state,
  buckets,
  onSet,
}: {
  minField: FilterField;
  maxField: FilterField;
  state: FilterState;
  buckets: [string, string][];
  onSet: (pairs: [string, string][]) => void;
}) {
  const { t, locale } = useI18n();
  const isPrice = minField.key === "priceMin";
  const suffix = rangeSuffix(minField, state) ?? "";
  const min = state[minField.key] ?? "";
  const max = state[maxField.key] ?? "";
  const bad = Boolean(min && max && Number(min) > Number(max));
  const show = (v: string) => (v && grouped(minField.key) ? Number(v).toLocaleString("tr-TR") : v);
  const minId = `qf-${minField.key}`;
  const maxId = `qf-${maxField.key}`;
  const top = Math.max(0, ...buckets.flat().filter(Boolean).map(Number));

  return (
    <div className="qf-range">
      {isPrice ? (
        <div className="qf-block">
          <p className="qf-block-title">{t("cur.label")}</p>
          <CurrencyChips value={state.currency ?? ""} onChange={(v) => onSet([["currency", v]])} order={PHONE_CURRENCIES} />
        </div>
      ) : null}
      {isPrice && top > 0 ? (
        <RangeSlider
          top={top}
          min={min}
          max={max}
          label={t("flt.price")}
          format={(n) => compactAmount(n, locale)}
          onCommit={(a, b) =>
            onSet([
              [minField.key, a],
              [maxField.key, b],
            ])
          }
        />
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
