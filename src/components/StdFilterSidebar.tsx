"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { SearchSelect } from "@/components/SearchSelect";
import { useI18n } from "@/context/I18nContext";
import { CountrySwitch } from "@/components/CountrySwitch";
import { isKktcCity, parseCountry, regionNamesFor } from "@/data/locations";
import { districtsOf } from "@/data/turkey";
import { mahallelerOf } from "@/data/regionProfiles";

function SheetAcc({
  title,
  value,
  open,
  children,
}: {
  title: string;
  value?: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="flt-acc flt-acc-sheet" open={open}>
      <summary className="flt-acc-sum">
        <span className="flt-acc-title">{title}</span>
        {value ? <span className="flt-acc-val">{value}</span> : null}
        <ChevronDown className="flt-acc-chev h-4 w-4" />
      </summary>
      <div className="flt-acc-body">{children}</div>
    </details>
  );
}

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
  primary,
  extra,
  plugins,
  city,
  district,
  neighborhood = "",
  onNeighborhood,
  posted,
  mappedOnly,
  draft,
  includeDesc,
  more,
  compact,
  resultCount,
  datePresets = STD_DATE_PRESETS,
  onCity,
  onDistrict,
  onPosted,
  onMappedOnly,
  onDraft,
  onIncludeDesc,
  onMore,
  onSearch,
  onClear,
  tail,
  afterPosted,
  moreButton,
  country,
  onCountry,
}: {
  afterPosted?: ReactNode;
  /** Replaces the inline "more filters" toggle (e.g. a button that opens a dialog). */
  moreButton?: ReactNode;
  cats?: ReactNode;
  primary?: ReactNode;
  extra?: ReactNode;
  plugins?: ReactNode;
  city: string;
  district: string;
  neighborhood?: string;
  onNeighborhood?: (value: string) => void;
  posted: string;
  mappedOnly: boolean;
  draft: string;
  includeDesc: boolean;
  more: boolean;
  compact?: boolean;
  resultCount?: number;
  datePresets?: readonly { id: string; labelKey: string }[];
  onCity: (value: string) => void;
  onDistrict: (value: string) => void;
  onPosted: (value: string) => void;
  onMappedOnly: (value: boolean) => void;
  onDraft: (value: string) => void;
  onIncludeDesc: (value: boolean) => void;
  onMore: () => void;
  onSearch: () => void;
  onClear?: () => void;
  tail?: ReactNode;
  /** URL form of the country filter (`""`, `tr`, `kktc`); the switch is shown only with `onCountry`. */
  country?: string;
  onCountry?: (value: string) => void;
}) {
  const { t } = useI18n();
  const picked = parseCountry(country);
  const kktc = picked === "KKTC" || isKktcCity(city);
  const districts = city ? districtsOf(city) : [];
  const hoods = onNeighborhood && city && district ? mahallelerOf(city, district) : [];
  const dateLabel = datePresets.find((p) => p.id === posted);
  const anyPlace = picked === "KKTC" ? t("loc.kktcAll") : picked === "TR" ? t("loc.trAll") : t("loc.allPlaces");
  const locLabel = [city, district, neighborhood].filter(Boolean).join(" / ") || anyPlace;
  const searchLabel =
    resultCount != null ? t("flt.apply", { n: resultCount }) : t("common.search");
  const hasMore = Boolean(extra || plugins);

  const fields = (
    <>
      {cats}

      <SheetAcc title={t("acil.address")} value={locLabel} open={Boolean(city || picked)}>
        {onCountry ? <CountrySwitch value={country ?? ""} onChange={onCountry} /> : null}
        <SearchSelect
          label={kktc ? t("loc.kktcRegion") : t("acil.il")}
          value={city}
          options={regionNamesFor(picked)}
          placeholder={anyPlace}
          anyLabel={anyPlace}
          onChange={(v) => {
            onCity(v);
            onDistrict("");
          }}
        />
        <SearchSelect
          label={kktc ? t("loc.kktcPlace") : t("acil.ilce")}
          value={district}
          options={districts}
          placeholder={kktc ? t("loc.kktcPlace") : t("acil.ilce")}
          disabled={!city}
          anyLabel={kktc ? t("loc.kktcPlace") : t("acil.ilce")}
          onChange={onDistrict}
        />
        {onNeighborhood && hoods.length > 0 ? (
          <SearchSelect
            label={t("post.neighborhood")}
            value={neighborhood}
            options={hoods}
            placeholder={t("post.neighborhood")}
            anyLabel={t("flt.any")}
            onChange={onNeighborhood}
          />
        ) : null}
      </SheetAcc>

      {primary}

      <SheetAcc title={t("acil.date")} value={dateLabel ? t(dateLabel.labelKey) : undefined} open={Boolean(posted)}>
        <div className="acil-date-btns" role="radiogroup" aria-label={t("acil.date")}>
          {datePresets.map((p) => {
            const on = posted === p.id;
            return (
              <button
                key={p.id || "any"}
                type="button"
                className={on ? "is-on" : ""}
                aria-pressed={on}
                onClick={() => onPosted(p.id)}
              >
                {t(p.labelKey)}
              </button>
            );
          })}
        </div>
      </SheetAcc>

      {afterPosted}

      {more ? (
        <>
          <SheetAcc title={t("acil.map")} open={mappedOnly}>
            <label className="acil-check">
              <input type="checkbox" checked={mappedOnly} onChange={(e) => onMappedOnly(e.target.checked)} />
              {t("acil.mapOnly")}
            </label>
          </SheetAcc>
          <SheetAcc title={t("acil.word")} open={Boolean(draft)}>
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
          </SheetAcc>
          {plugins}
          {extra}
        </>
      ) : null}

      {moreButton ?? (hasMore || !more ? (
        <button type="button" className="flt-more-btn" onClick={onMore}>
          {more ? t("flt.lessBtn") : `+ ${t("flt.moreBtn")}`}
        </button>
      ) : null)}
    </>
  );

  const actions = (
    <div className={`flt-apply-row ${compact ? "is-sheet" : ""}`}>
      {onClear ? (
        <button type="button" className="flt-clear-btn" onClick={onClear}>
          {t("flt.clearShort")}
        </button>
      ) : null}
      <button type="button" className="acil-search-btn" onClick={onSearch}>
        {searchLabel}
      </button>
    </div>
  );

  if (compact) {
    return (
      <>
        <div data-filter-scroll className="filter-sheet-body min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {fields}
          {tail}
        </div>
        <div className="filter-sheet-foot sticky bottom-0 z-20 mt-auto w-full shrink-0">{actions}</div>
      </>
    );
  }

  return (
    <>
      {fields}
      {actions}
      {tail}
    </>
  );
}
