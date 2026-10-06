"use client";

import { ChevronDown, ChevronLeft, X } from "lucide-react";
import { useState } from "react";
import { CategoryDrill } from "@/components/CategoryDrill";
import { SearchSelect } from "@/components/SearchSelect";
import { TutorFilterChips } from "@/components/TutorFilterChips";
import { StdFilterSidebar } from "@/components/StdFilterSidebar";
import { catName, useI18n } from "@/context/I18nContext";
import { categoryPath, visibleChildren, type Category } from "@/data/categories";
import {
  districtOptions,
  filterNavFor,
  HOURS_PRESETS,
  KM_PRESETS,
  PRICE_PRESETS,
  resolvedOptions,
  SQM_PRESETS,
  YEAR_OPTIONS,
  countFilterOption,
  type FilterField,
  type FilterState,
} from "@/lib/categoryFilters";
import type { Listing } from "@/data/store";

function fieldTitle(t: (key: string, vars?: Record<string, string | number>) => string, key: string) {
  const label = t(key);
  if (label !== key) return label;
  const tail = key.includes(".") ? key.slice(key.lastIndexOf(".") + 1) : key;
  const names: Record<string, string> = {
    price: "Fiyat",
    priceMin: "Fiyat",
    gvw: "Azami Yüklü Ağırlık",
    jobType: "Çalışma Şekli",
    craft: "Hava Aracı Tipi",
    charge: "Hızlı Şarj Süresi",
    cylinders: "Silindir Sayısı",
    cooling: "Soğutma Tipi",
    berths: "Yatak Sayısı",
    damageKind: "Hasar Türü",
    cpu: "İşlemci",
    ram: "RAM",
    gpu: "Ekran kartı",
    os: "İşletim sistemi",
    warranty: "Garanti",
    screen: "Ekran",
    tvSize: "Ekran boyutu",
    tvRes: "Çözünürlük",
    species: "Hayvan",
    sector: "Sektör",
    helpGender: "Cinsiyet",
    helpLang: "Dil",
    servicePlace: "Hizmet yeri",
    serviceExp: "Deneyim",
    babyAge: "Yaş grubu",
    era: "Dönem",
    console: "Konsol",
    bookLang: "Dil",
    musicType: "Tür",
  };
  return names[tail] ?? tail;
}

function RangePair({
  minField,
  maxField,
  state,
  onChange,
  presets,
  hideLabel,
}: {
  minField: FilterField;
  maxField: FilterField;
  state: FilterState;
  onChange: (key: string, value: string) => void;
  presets: string[];
  hideLabel?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={hideLabel ? "" : "flt-group"}>
      {hideLabel ? null : <p className="flt-label">{fieldTitle(t, minField.labelKey)}</p>}
      <div className="flt-range">
        <input
          inputMode="numeric"
          value={state[minField.key] ?? ""}
          onChange={(e) => onChange(minField.key, e.target.value.replace(/[^\d]/g, ""))}
          placeholder={t("flt.min")}
          className="flt-input"
        />
        <span className="flt-range-sep">—</span>
        <input
          inputMode="numeric"
          value={state[maxField.key] ?? ""}
          onChange={(e) => onChange(maxField.key, e.target.value.replace(/[^\d]/g, ""))}
          placeholder={t("flt.max")}
          className="flt-input"
        />
      </div>
      {presets.length > 0 ? (
        <div className="flt-presets">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              className={`flt-preset ${state[maxField.key] === p ? "is-on" : ""}`}
              onClick={() => onChange(maxField.key, state[maxField.key] === p ? "" : p)}
            >
              {p}
              {minField.suffix ? ` ${minField.suffix}` : "+"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FieldControl({
  field,
  fields,
  state,
  onChange,
  hideLabel,
  listings,
}: {
  field: FilterField;
  fields: FilterField[];
  state: FilterState;
  onChange: (key: string, value: string) => void;
  hideLabel?: boolean;
  listings?: Listing[];
}) {
  const { t } = useI18n();
  if (field.kind === "range" && field.pairKey && field.key.endsWith("Max")) return null;
  if (field.kind === "range" && field.pairKey && field.key.endsWith("Min")) {
    const maxField = fields.find((f) => f.key === field.pairKey);
    if (!maxField) return null;
    const presets = field.key.startsWith("price")
      ? PRICE_PRESETS
      : field.key.startsWith("km")
        ? KM_PRESETS
        : field.key.startsWith("sqm")
          ? SQM_PRESETS
          : field.key.startsWith("hours")
            ? HOURS_PRESETS
            : field.key.startsWith("year")
              ? YEAR_OPTIONS.filter((_, i) => i % 8 === 0).slice(0, 6)
              : [];
    return (
      <RangePair
        minField={field}
        maxField={maxField}
        state={state}
        onChange={onChange}
        presets={presets}
        hideLabel={hideLabel}
      />
    );
  }
  if (field.kind === "text") {
    return (
      <label className={hideLabel ? "block" : "flt-group"}>
        {hideLabel ? <span className="sr-only">{fieldTitle(t, field.labelKey)}</span> : <span className="flt-label">{fieldTitle(t, field.labelKey)}</span>}
        <input
          type="search"
          className="flt-input"
          value={state[field.key] ?? ""}
          placeholder={t(field.labelKey === "flt.inResults" ? "flt.inResults" : "flt.keywordPh")}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </label>
    );
  }
  if (field.kind === "toggle") {
    const on = state[field.key] === "1";
    return (
      <button
        type="button"
        className={`flt-toggle ${on ? "is-on" : ""}`}
        onClick={() => onChange(field.key, on ? "" : "1")}
      >
        {fieldTitle(t, field.labelKey)}
      </button>
    );
  }
  if (field.ui === "chips" && field.chipKind) {
    return (
      <TutorFilterChips
        options={resolvedOptions(field, state)}
        value={state[field.key] ?? ""}
        onChange={(v) => onChange(field.key, v)}
        kind={field.chipKind}
      />
    );
  }
  if (field.kind === "multi" || field.key === "kimden") {
    const selected = new Set((state[field.key] ?? "").split(",").filter(Boolean));
    const options = field.options ?? resolvedOptions(field, state);
    return (
      <ul className="feat-check-list">
        {options.map((o) => {
          const on = selected.has(o);
          const n =
            listings && listings.length && listings.length <= 800
              ? countFilterOption(listings, fields, { ...state, [field.key]: "" }, field.key, o)
              : undefined;
          if (!on && n === 0) return null;
          return (
            <li key={o}>
              <button
                type="button"
                className={`feat-item ${on ? "is-on" : ""}`}
                onClick={() => {
                  const next = new Set(selected);
                  if (on) next.delete(o);
                  else next.add(o);
                  onChange(field.key, [...next].join(","));
                }}
              >
                <span className="feat-check" aria-hidden />
                {o}
                {n != null ? <span className="text-[11px] text-muted"> ({n})</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const locked = Boolean(field.dependsOn && !state[field.dependsOn ?? ""]);
  const options = field.kind === "district" ? districtOptions(state.city) : resolvedOptions(field, state);
  const optionCounts =
    !locked && listings && listings.length && listings.length <= 800
      ? Object.fromEntries(
          options.map((o) => [o, countFilterOption(listings, fields, state, field.key, o) ?? 0]),
        )
      : undefined;
  const placeholder = locked
    ? field.dependsOn === "brand"
      ? t("flt.brandFirst")
      : field.dependsOn === "model"
        ? t("flt.modelFirst")
        : field.dependsOn === "trim" || field.dependsOn === "series"
          ? t("flt.trimFirst")
          : field.dependsOn === "engine"
            ? t("flt.engineFirst")
            : field.dependsOn === "body"
              ? t("flt.bodyFirst")
              : field.dependsOn === "district"
                ? t("flt.districtFirst")
                : t("flt.cityFirst")
    : t("flt.any");

  if (field.kind === "city" || field.kind === "district" || field.searchable) {
    return (
      <SearchSelect
        label={fieldTitle(t, field.labelKey)}
        value={state[field.key] ?? ""}
        options={options}
        placeholder={placeholder}
        disabled={locked}
        hideLabel={hideLabel}
        anyLabel={t("flt.any")}
        optionCounts={optionCounts}
        onChange={(v) => onChange(field.key, v)}
      />
    );
  }

  const visible = options.filter((o) => {
    if (!optionCounts) return true;
    if (o === (state[field.key] ?? "")) return true;
    return (optionCounts[o] ?? 0) > 0;
  });

  return (
    <label className={hideLabel ? "block" : "flt-group"}>
      {hideLabel ? <span className="sr-only">{fieldTitle(t, field.labelKey)}</span> : <span className="flt-label">{fieldTitle(t, field.labelKey)}</span>}
      <select
        className="flt-select"
        value={state[field.key] ?? ""}
        disabled={locked}
        onChange={(e) => onChange(field.key, e.target.value)}
      >
        <option value="">{placeholder}</option>
        {visible.map((o) => (
          <option key={o} value={o}>
            {optionCounts ? `${o} (${optionCounts[o]})` : o}
          </option>
        ))}
      </select>
    </label>
  );
}
const STD_FIELD_KEYS = new Set(["city", "district", "posted", "keyword", "hours24"]);
const PRIMARY_FIELD_KEYS = new Set(["priceMin", "priceMax", "kimden"]);
const PLUGIN_FIELD_KEYS = new Set([
  "brand",
  "model",
  "trim",
  "rooms",
  "deal",
  "product",
  "cond",
  "kimden",
  "yearMin",
  "kmMin",
  "fuel",
  "gear",
  "sqmMin",
  "priceMin",
  "jobType",
  "subject",
]);

function renderExtraField(
  field: FilterField,
  fields: FilterField[],
  state: FilterState,
  onChange: (key: string, value: string) => void,
  t: (key: string, vars?: Record<string, string | number>) => string,
  listings?: Listing[],
) {
  return (
    <div key={field.key} className="flt-field-block">
      <p className="flt-field-label">{fieldTitle(t, field.labelKey)}</p>
      <FieldControl field={field} fields={fields} state={state} onChange={onChange} hideLabel listings={listings} />
    </div>
  );
}

export function FilterPanel({
  fields,
  state,
  resultCount,
  onChange,
  onClear,
  onClose,
  onCollapse,
  collapseControls,
  variant = "aside",
  subcats,
  activeCatId,
  renoRoot,
  currentCat,
  catCounts,
  listings,
  wordDraft,
  onWordDraft,
  onSearch,
  onPickCategory,
  navRoot,
}: {
  fields: FilterField[];
  state: FilterState;
  resultCount: number;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  onClose?: () => void;
  onCollapse?: () => void;
  collapseControls?: string;
  variant?: "aside" | "sheet";
  subcats?: Category[];
  activeCatId?: string;
  subcatsTitleKey?: string;
  renoRoot?: Category | null;
  currentCat?: Category | null;
  catCounts?: Record<string, number>;
  listings?: Listing[];
  wordDraft?: string;
  onWordDraft?: (value: string) => void;
  onSearch?: () => void;
  onPickCategory?: (cat: Category) => void;
  navRoot?: Category | null;
}) {
  const { t } = useI18n();
  const [more, setMore] = useState(false);
  const [drill, setDrill] = useState(false);
  const [localDraft, setLocalDraft] = useState(state.keyword ?? "");
  const draft = wordDraft ?? localDraft;
  const setDraft = onWordDraft ?? setLocalDraft;
  const stay = Boolean(onPickCategory);
  void activeCatId;
  void renoRoot;
  void catCounts;
  const nav = currentCat && !renoRoot ? filterNavFor(currentCat, state) : { crumbs: [], items: [], treeKeys: [] as string[] };
  const treeRoots: Category[] = navRoot
    ? visibleChildren(navRoot).length
      ? visibleChildren(navRoot)
      : [navRoot]
    : currentCat && visibleChildren(currentCat).length
      ? visibleChildren(currentCat)
      : subcats ?? [];
  const extraFields = fields.filter((field) => {
    if (STD_FIELD_KEYS.has(field.key)) return false;
    if (nav.treeKeys.includes(field.key) && !field.preferOpen && !PLUGIN_FIELD_KEYS.has(field.key)) return false;
    if (field.kind === "range" && field.key.endsWith("Max")) return false;
    return true;
  });
  const primaryFields = extraFields.filter((f) => PRIMARY_FIELD_KEYS.has(f.key));
  const restFields = extraFields.filter((f) => !PRIMARY_FIELD_KEYS.has(f.key));
  const pluginFields = restFields.filter((f) => f.preferOpen || PLUGIN_FIELD_KEYS.has(f.key));
  const pluginKeys = new Set(pluginFields.map((f) => f.key));
  const moreFields = restFields.filter((f) => !pluginKeys.has(f.key));
  const path = categoryPath(currentCat);
  const pathLabel = path.map((c) => catName(t, c.id, c.name)).filter(Boolean).join(" › ") || t("nav.categories");
  const locSummary = [state.city, state.district].filter(Boolean).join(" / ");
  const priceSummary = [state.priceMin, state.priceMax].filter(Boolean).join(" – ");
  const kimdenSummary = state.kimden || "";

  const catCard = (
    <button type="button" className="flt-cat-card" onClick={() => setDrill(true)}>
      <span className="flt-cat-card-k">{t("flt.cat")}</span>
      <span className="flt-cat-card-path">{pathLabel}</span>
      <span className="flt-cat-card-go">{t("flt.cat.change")} ›</span>
    </button>
  );

  if (drill) {
    return (
      <div className={variant === "sheet" ? "contents" : "filter-aside acil-side"}>
        {onClose && variant === "sheet" ? (
          <div className="filter-head">
            <h2 className="filter-title">{t("flt.cat.pick")}</h2>
            <button type="button" className="filter-x" onClick={onClose} aria-label={t("common.close")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div data-filter-scroll={variant === "sheet" ? true : undefined} className={variant === "sheet" ? "filter-sheet-body min-h-0 flex-1 overflow-y-auto" : undefined}>
          <CategoryDrill
            roots={treeRoots.length ? treeRoots : (subcats ?? [])}
            selected={currentCat}
            stay={stay}
            onPick={(cat) => {
              onPickCategory?.(cat);
              setDrill(false);
            }}
            onBackOut={() => setDrill(false)}
          />
        </div>
      </div>
    );
  }

  const primary = (
    <>
      {primaryFields.map((field) => {
        const title = fieldTitle(t, field.labelKey);
        const value =
          field.key === "priceMin" ? (priceSummary ? `${priceSummary} TL` : undefined)
          : field.key === "kimden" ? kimdenSummary || undefined
          : locSummary || undefined;
        return (
          <details key={field.key} className="flt-acc flt-acc-sheet" open={Boolean(value)}>
            <summary className="flt-acc-sum">
              <span className="flt-acc-title">{title}</span>
              {value ? <span className="flt-acc-val">{value}</span> : null}
              <ChevronDown className="flt-acc-chev h-4 w-4" />
            </summary>
            <div className="flt-acc-body">
              <FieldControl field={field} fields={fields} state={state} onChange={onChange} hideLabel listings={listings} />
            </div>
          </details>
        );
      })}
    </>
  );

  const plugins =
    pluginFields.length > 0 ? (
      <>
        {pluginFields.map((field) => (
          <details key={field.key} className="flt-acc flt-acc-sheet">
            <summary className="flt-acc-sum">
              <span className="flt-acc-title">{fieldTitle(t, field.labelKey)}</span>
              <ChevronDown className="flt-acc-chev h-4 w-4" />
            </summary>
            <div className="flt-acc-body">
              <FieldControl field={field} fields={fields} state={state} onChange={onChange} hideLabel listings={listings} />
            </div>
          </details>
        ))}
      </>
    ) : null;

  const extra =
    moreFields.length > 0 ? (
      <>{moreFields.map((field) => renderExtraField(field, fields, state, onChange, t, listings))}</>
    ) : null;

  return (
    <div className={variant === "sheet" ? "contents" : "filter-aside acil-side"}>
      {onClose ? (
        <div className="filter-head">
          <h2 className="filter-title">{t("cat.filter")}</h2>
          <button type="button" className="filter-x" onClick={onClose} aria-label={t("common.close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flt-side-head">
          <h2>{t("cat.filter")}</h2>
          <button type="button" className="flt-side-clear" onClick={onClear}>
            {t("flt.clearShort")}
          </button>
          {onCollapse ? (
            <button
              type="button"
              className="flt-side-collapse"
              data-sidebar-collapse
              aria-expanded
              aria-controls={collapseControls}
              aria-label={t("flt.sidebar.hide")}
              title={t("flt.sidebar.hide")}
              onClick={onCollapse}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      )}
      <StdFilterSidebar
        cats={catCard}
        primary={primary}
        extra={extra}
        plugins={plugins}
        city={state.city ?? ""}
        district={state.district ?? ""}
        posted={state.posted ?? ""}
        mappedOnly={state.mappedOnly === "1"}
        draft={draft}
        includeDesc={state.includeDesc === "1"}
        more={more}
        compact={variant === "sheet"}
        resultCount={resultCount}
        onCity={(v) => onChange("city", v)}
        onDistrict={(v) => onChange("district", v)}
        onPosted={(v) => onChange("posted", v)}
        onMappedOnly={(v) => onChange("mappedOnly", v ? "1" : "")}
        onDraft={setDraft}
        onIncludeDesc={(v) => onChange("includeDesc", v ? "1" : "")}
        onMore={() => setMore((v) => !v)}
        onClear={onClear}
        onSearch={() => {
          (onSearch ?? (() => onChange("keyword", draft.trim())))();
          onClose?.();
        }}
      />
    </div>
  );
}
