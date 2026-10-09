"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { districtsOf } from "@/data/turkey";
import { FIRM_LIMITS, type FirmExtras, type FirmHours } from "@/lib/business/firmProfile";
import type { OwnerBusiness } from "@/lib/business/shared";
import { apiPatch } from "@/lib/security/client";
import { Field } from "@/components/business/BusinessFormFields";

type HoursMode = "none" | "always" | "weekly";
type DayRow = { on: boolean; open: string; close: string };
type PriceRow = { title: string; min: string; max: string; unit: string };

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

function initialDays(hours: FirmHours | null): Record<number, DayRow> {
  const out: Record<number, DayRow> = {};
  for (const day of DAYS) {
    const row = hours && !hours.always ? hours.days.find((d) => d.day === day) : undefined;
    out[day] = row ? { on: true, open: row.open, close: row.close } : { on: false, open: "09:00", close: "18:00" };
  }
  return out;
}

/** Owner-entered service profile shown on the provider page; nothing here is ever pre-filled by the app. */
export function FirmExtrasEditor({
  business,
  onSaved,
}: {
  business: OwnerBusiness;
  onSaved: (b: OwnerBusiness) => void;
}) {
  const { t } = useI18n();
  const extras: FirmExtras = business.extras;
  const [mode, setMode] = useState<HoursMode>(!extras.hours ? "none" : extras.hours.always ? "always" : "weekly");
  const [days, setDays] = useState(() => initialDays(extras.hours));
  const [districts, setDistricts] = useState<string[]>(extras.serviceDistricts);
  const [prices, setPrices] = useState<PriceRow[]>(
    extras.priceList.map((p) => ({ title: p.title, min: String(p.min), max: p.max ? String(p.max) : "", unit: p.unit ?? "" })),
  );
  const [news, setNews] = useState<string[]>(extras.announcements.map((a) => a.text));
  const [faq, setFaq] = useState(extras.faq);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const cityDistricts = business.city ? districtsOf(business.city) : [];

  function hoursPayload(): FirmHours | null {
    if (mode === "none") return null;
    if (mode === "always") return { always: true };
    return {
      always: false,
      days: DAYS.filter((d) => days[d].on).map((d) => ({ day: d, open: days[d].open, close: days[d].close })),
    };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    const res = await apiPatch<{ ok?: boolean; error?: string; business?: OwnerBusiness }>("/api/account/business", {
      hours: hoursPayload(),
      serviceDistricts: districts,
      priceList: prices
        .filter((p) => p.title.trim() || p.min.trim())
        .map((p) => ({
          title: p.title.trim(),
          min: Number(p.min.replace(",", ".")),
          max: p.max.trim() ? Number(p.max.replace(",", ".")) : null,
          unit: p.unit.trim(),
        })),
      announcements: news.map((text) => ({ text: text.trim() })).filter((a) => a.text),
      faq: faq.map((f) => ({ q: f.q.trim(), a: f.a.trim() })).filter((f) => f.q || f.a),
    });
    setBusy(false);
    if (!res.ok || !res.business) return setError(t(res.error ?? "auth.err.server"));
    onSaved(res.business);
    setSaved(true);
  }

  const setDay = (day: number, patch: Partial<DayRow>) => setDays((cur) => ({ ...cur, [day]: { ...cur[day], ...patch } }));

  return (
    <section className="biz-card">
      <h2>{t("biz.firm.title")}</h2>
      <p className="biz-hint">{t("biz.firm.lead")}</p>
      <form className="biz-form" onSubmit={save}>
        <fieldset className="biz-fx">
          <legend>{t("biz.firm.hours")}</legend>
          <div className="biz-fx-modes" role="radiogroup">
            {(["none", "always", "weekly"] as const).map((m) => (
              <label key={m} className="biz-fx-check">
                <input type="radio" name="firm-hours" checked={mode === m} onChange={() => setMode(m)} />
                {t(m === "none" ? "biz.firm.hoursNone" : m === "always" ? "biz.firm.hoursAlways" : "biz.firm.hoursWeekly")}
              </label>
            ))}
          </div>
          {mode === "weekly" ? (
            <ul className="biz-fx-days">
              {DAYS.map((day) => (
                <li key={day}>
                  <label className="biz-fx-check">
                    <input type="checkbox" checked={days[day].on} onChange={(e) => setDay(day, { on: e.target.checked })} />
                    {t(`day.${day}`)}
                  </label>
                  {days[day].on ? (
                    <span className="biz-fx-times">
                      <input
                        type="time"
                        className="dash-input"
                        aria-label={`${t(`day.${day}`)} ${t("biz.firm.open")}`}
                        value={days[day].open}
                        onChange={(e) => setDay(day, { open: e.target.value })}
                        required
                      />
                      –
                      <input
                        type="time"
                        className="dash-input"
                        aria-label={`${t(`day.${day}`)} ${t("biz.firm.close")}`}
                        value={days[day].close}
                        onChange={(e) => setDay(day, { close: e.target.value })}
                        required
                      />
                    </span>
                  ) : (
                    <span className="biz-hint">{t("firm.hours.closedDay")}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </fieldset>

        {cityDistricts.length ? (
          <fieldset className="biz-fx">
            <legend>{t("biz.firm.districts", { city: business.city })}</legend>
            <div className="biz-fx-row">
              <button type="button" className="biz-link" onClick={() => setDistricts(cityDistricts)}>
                {t("biz.firm.allDistricts")}
              </button>
              <button type="button" className="biz-link" onClick={() => setDistricts([])}>
                {t("biz.firm.clear")}
              </button>
            </div>
            <div className="biz-fx-districts">
              {cityDistricts.map((d) => (
                <label key={d} className="biz-fx-check">
                  <input
                    type="checkbox"
                    checked={districts.includes(d)}
                    onChange={(e) => setDistricts((cur) => (e.target.checked ? [...cur, d] : cur.filter((x) => x !== d)))}
                  />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset className="biz-fx">
          <legend>{t("biz.firm.prices")}</legend>
          {prices.map((p, i) => (
            <div key={i} className="biz-fx-price">
              <Field label={t("biz.firm.priceTitle")}>
                <input
                  className="dash-input"
                  maxLength={FIRM_LIMITS.priceTitle}
                  value={p.title}
                  onChange={(e) => setPrices((cur) => cur.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))}
                />
              </Field>
              <Field label={t("biz.firm.priceMin")}>
                <input
                  className="dash-input"
                  inputMode="decimal"
                  value={p.min}
                  onChange={(e) => setPrices((cur) => cur.map((r, j) => (j === i ? { ...r, min: e.target.value } : r)))}
                />
              </Field>
              <Field label={t("biz.firm.priceMax")}>
                <input
                  className="dash-input"
                  inputMode="decimal"
                  value={p.max}
                  onChange={(e) => setPrices((cur) => cur.map((r, j) => (j === i ? { ...r, max: e.target.value } : r)))}
                />
              </Field>
              <Field label={t("biz.firm.priceUnit")}>
                <input
                  className="dash-input"
                  maxLength={FIRM_LIMITS.priceUnit}
                  value={p.unit}
                  onChange={(e) => setPrices((cur) => cur.map((r, j) => (j === i ? { ...r, unit: e.target.value } : r)))}
                />
              </Field>
              <button
                type="button"
                className="biz-fx-remove"
                aria-label={t("biz.firm.remove")}
                onClick={() => setPrices((cur) => cur.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {prices.length < FIRM_LIMITS.priceRows ? (
            <button type="button" className="biz-link" onClick={() => setPrices((cur) => [...cur, { title: "", min: "", max: "", unit: "" }])}>
              <Plus aria-hidden="true" className="inline h-4 w-4" /> {t("biz.firm.add")}
            </button>
          ) : null}
        </fieldset>

        <fieldset className="biz-fx">
          <legend>{t("biz.firm.announcements")}</legend>
          {news.map((text, i) => (
            <div key={i} className="biz-fx-item">
              <textarea
                className="dash-input biz-textarea"
                rows={2}
                maxLength={FIRM_LIMITS.announcementText}
                value={text}
                onChange={(e) => setNews((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button
                type="button"
                className="biz-fx-remove"
                aria-label={t("biz.firm.remove")}
                onClick={() => setNews((cur) => cur.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {news.length < FIRM_LIMITS.announcements ? (
            <button type="button" className="biz-link" onClick={() => setNews((cur) => [...cur, ""])}>
              <Plus aria-hidden="true" className="inline h-4 w-4" /> {t("biz.firm.add")}
            </button>
          ) : null}
        </fieldset>

        <fieldset className="biz-fx">
          <legend>{t("biz.firm.faq")}</legend>
          {faq.map((item, i) => (
            <div key={i} className="biz-fx-item">
              <div className="biz-fx-qa">
                <Field label={t("biz.firm.question")}>
                  <input
                    className="dash-input"
                    maxLength={FIRM_LIMITS.question}
                    value={item.q}
                    onChange={(e) => setFaq((cur) => cur.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                  />
                </Field>
                <Field label={t("biz.firm.answer")}>
                  <textarea
                    className="dash-input biz-textarea"
                    rows={2}
                    maxLength={FIRM_LIMITS.answer}
                    value={item.a}
                    onChange={(e) => setFaq((cur) => cur.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                  />
                </Field>
              </div>
              <button
                type="button"
                className="biz-fx-remove"
                aria-label={t("biz.firm.remove")}
                onClick={() => setFaq((cur) => cur.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ))}
          {faq.length < FIRM_LIMITS.faq ? (
            <button type="button" className="biz-link" onClick={() => setFaq((cur) => [...cur, { q: "", a: "" }])}>
              <Plus aria-hidden="true" className="inline h-4 w-4" /> {t("biz.firm.add")}
            </button>
          ) : null}
        </fieldset>

        {error ? <p className="biz-err">{error}</p> : null}
        {saved ? <p className="biz-ok">{t("biz.saved")}</p> : null}
        <div className="biz-form-actions">
          <button type="submit" className="biz-btn is-primary" disabled={busy}>
            {busy ? t("common.loading") : t("biz.firm.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
