"use client";

import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/context/I18nContext";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";

export const STD_DATE_PRESETS = [
  { id: "", labelKey: "acil.date.any" },
  { id: "1", labelKey: "acil.date.1" },
  { id: "3", labelKey: "acil.date.3" },
  { id: "7", labelKey: "acil.date.7" },
  { id: "15", labelKey: "acil.date.15" },
  { id: "30", labelKey: "acil.date.30" },
] as const;

export const STD_FRESH_PRESETS = [
  { id: "", labelKey: "acil.date.any" },
  { id: "6h", labelKey: "fresh.date.6" },
  { id: "12h", labelKey: "fresh.date.12" },
  { id: "24h", labelKey: "fresh.date.24" },
] as const;

export function StdFilterSidebar({
  cats,
  extra,
  plugins,
  city,
  district,
  posted,
  mappedOnly,
  draft,
  includeDesc,
  more,
  datePresets = STD_DATE_PRESETS,
  radioName = "std-date",
  onCity,
  onDistrict,
  onPosted,
  onMappedOnly,
  onDraft,
  onIncludeDesc,
  onMore,
  onSearch,
}: {
  cats?: ReactNode;
  extra?: ReactNode;
  plugins?: ReactNode;
  city: string;
  district: string;
  posted: string;
  mappedOnly: boolean;
  draft: string;
  includeDesc: boolean;
  more: boolean;
  datePresets?: readonly { id: string; labelKey: string }[];
  radioName?: string;
  onCity: (value: string) => void;
  onDistrict: (value: string) => void;
  onPosted: (value: string) => void;
  onMappedOnly: (value: boolean) => void;
  onDraft: (value: string) => void;
  onIncludeDesc: (value: boolean) => void;
  onMore: () => void;
  onSearch: () => void;
}) {
  const { t } = useI18n();
  const districts = city ? districtsOf(city) : [];

  return (
    <>
      {cats}

      <section className="acil-flt">
        <h2>{t("acil.address")}</h2>
        <label className="acil-field">
          <span>{t("acil.il")}</span>
          <select
            value={city}
            onChange={(e) => {
              onCity(e.target.value);
              onDistrict("");
            }}
          >
            <option value="">{t("acil.turkey")}</option>
            {TURKEY_CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="acil-field">
          <span>{t("acil.ilce")}</span>
          <select value={district} onChange={(e) => onDistrict(e.target.value)} disabled={!city}>
            <option value="">{t("acil.ilce")}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="acil-flt">
        <h2>{t("acil.date")}</h2>
        <div className="acil-radios">
          {datePresets.map((p) => (
            <label key={p.id || "any"}>
              <input
                type="radio"
                name={radioName}
                checked={posted === p.id}
                onChange={() => onPosted(p.id)}
              />
              {t(p.labelKey)}
            </label>
          ))}
        </div>
      </section>

      <section className="acil-flt">
        <h2>{t("acil.map")}</h2>
        <label className="acil-check">
          <input type="checkbox" checked={mappedOnly} onChange={(e) => onMappedOnly(e.target.checked)} />
          {t("acil.mapOnly")}
        </label>
      </section>

      <section className="acil-flt">
        <h2>{t("acil.word")}</h2>
        <input
          className="acil-input"
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
          placeholder={t("acil.wordPh")}
        />
        <label className="acil-check">
          <input type="checkbox" checked={includeDesc} onChange={(e) => onIncludeDesc(e.target.checked)} />
          {t("acil.inclDesc")}
        </label>
      </section>

      {plugins}

      {extra ? (
        <>
          <button type="button" className="acil-more" onClick={onMore}>
            {more ? t("acil.moreHide") : t("acil.more")}
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          {more ? (
            <div className="acil-extra">
              <p className="acil-live-hint">{t("acil.picksHint")}</p>
              {extra}
            </div>
          ) : null}
        </>
      ) : null}

      <p className="acil-live-hint">{t("acil.liveHint")}</p>
      <button type="button" className="acil-search-btn" onClick={onSearch}>
        {t("common.search")}
      </button>
    </>
  );
}
