"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SearchSelect } from "@/components/SearchSelect";
import { FilterRenoTree, toggleRenoLeaf } from "@/components/FilterRenoTree";
import { TutorFilterChips } from "@/components/TutorFilterChips";
import { StdFilterSidebar } from "@/components/StdFilterSidebar";
import { catName, useI18n } from "@/context/I18nContext";
import { hrefForCategory, formatListingCount, type Category } from "@/data/categories";
import {
  districtOptions,
  countNavItem,
  filterNavFor,
  HOURS_PRESETS,
  KM_PRESETS,
  PRICE_PRESETS,
  resolvedOptions,
  SQM_PRESETS,
  YEAR_OPTIONS,
  type FilterField,
  type FilterNavItem,
  type FilterState,
} from "@/lib/categoryFilters";
import type { Listing } from "@/data/store";

function fieldTitle(t: (key: string, vars?: Record<string, string | number>) => string, key: string) {
  const label = t(key);
  if (label !== key) return label;
  const tail = key.includes(".") ? key.slice(key.lastIndexOf(".") + 1) : key;
  const names: Record<string, string> = {
    payload: "İstihap Haddi / Taşıma Kapasitesi",
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
  const { t, currency, setCurrency } = useI18n();
  return (
    <div className={hideLabel ? "" : "flt-group"}>
      {hideLabel ? null : <p className="flt-label">{fieldTitle(t, minField.labelKey)}</p>}
      {minField.currencyTabs ? (
        <div className="flt-fx">
          {(
            [
              ["TRY", "TL"],
              ["USD", "USD"],
              ["EUR", "EUR"],
              ["GBP", "GBP"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`flt-fx-btn ${currency === id ? "is-on" : ""}`}
              onClick={() => setCurrency(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
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
}: {
  field: FilterField;
  fields: FilterField[];
  state: FilterState;
  onChange: (key: string, value: string) => void;
  hideLabel?: boolean;
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
  if (field.kind === "multi") {
    const selected = new Set((state[field.key] ?? "").split(",").filter(Boolean));
    return (
      <ul className="feat-check-list">
        {(field.options ?? []).map((o) => {
          const on = selected.has(o);
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
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  const locked = Boolean(field.dependsOn && !state[field.dependsOn ?? ""]);
  const options = field.kind === "district" ? districtOptions(state.city) : resolvedOptions(field, state);
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
        onChange={(v) => onChange(field.key, v)}
      />
    );
  }

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
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

const STD_FIELD_KEYS = new Set(["city", "district", "posted", "keyword", "hours24"]);
const PLUGIN_FIELD_KEYS = new Set([
  "brand",
  "model",
  "trim",
  "engine",
  "body",
  "product",
  "cond",
  "rooms",
  "deal",
  "subject",
  "jobType",
  "petKind",
  "helpType",
  "kind",
  "vehicleType",
  "storage",
  "kimden",
  "yearMin",
  "kmMin",
  "fuel",
  "gear",
  "sqmMin",
  "cpu",
  "ram",
  "gpu",
  "storage",
  "os",
  "warranty",
  "heat",
  "place",
  "exp",
  "education",
  "species",
  "tvSize",
]);

function renderExtraField(
  field: FilterField,
  fields: FilterField[],
  state: FilterState,
  onChange: (key: string, value: string) => void,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  return (
    <section key={field.key} className="acil-flt">
      <h2>{fieldTitle(t, field.labelKey)}</h2>
      <FieldControl field={field} fields={fields} state={state} onChange={onChange} hideLabel />
    </section>
  );
}

export function FilterPanel({
  fields,
  state,
  resultCount: _resultCount,
  onChange,
  onClear,
  onClose,
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
}: {
  fields: FilterField[];
  state: FilterState;
  resultCount: number;
  onChange: (key: string, value: string) => void;
  onClear: () => void;
  onClose?: () => void;
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
}) {
  const { t } = useI18n();
  const [more, setMore] = useState(false);
  const [localDraft, setLocalDraft] = useState(state.keyword ?? "");
  const draft = wordDraft ?? localDraft;
  const setDraft = onWordDraft ?? setLocalDraft;
  const nav = currentCat && !renoRoot ? filterNavFor(currentCat, state) : { crumbs: [], items: [], treeKeys: [] as string[] };
  const extraFields = fields.filter((field) => {
    if (STD_FIELD_KEYS.has(field.key)) return false;
    if (nav.treeKeys.includes(field.key)) return false;
    if (field.kind === "range" && field.key.endsWith("Max")) return false;
    return true;
  });
  const pluginFields = extraFields.filter((f) => f.preferOpen || PLUGIN_FIELD_KEYS.has(f.key));
  const pluginKeys = new Set(pluginFields.map((f) => f.key));
  const moreFields = extraFields.filter((f) => !pluginKeys.has(f.key));

  function navLabel(item: FilterNavItem) {
    return item.id.includes(":") ? item.label : catName(t, item.id, item.label);
  }

  function navCount(item: FilterNavItem) {
    if (item.href && catCounts && catCounts[item.id] != null) return catCounts[item.id];
    if (!listings?.length) return 0;
    return countNavItem(listings, fields, state, item);
  }

  function renderNavItem(item: FilterNavItem, withCount = true) {
    const n = withCount ? navCount(item) : undefined;
    const label = navLabel(item);
    const count = n != null ? <span>({formatListingCount(n)})</span> : null;
    if (item.href && !item.facet) {
      return (
        <Link href={item.href} className={item.active ? "is-on" : ""}>
          {label}
          {count}
        </Link>
      );
    }
    if (item.facet) {
      return (
        <button type="button" className={item.active ? "is-on" : ""} onClick={() => onChange(item.facet!.key, item.facet!.value)}>
          {label}
          {count}
        </button>
      );
    }
    return (
      <span className={item.active ? "is-on" : ""}>
        {label}
        {count}
      </span>
    );
  }

  const cats = renoRoot && currentCat ? (
    <div className="acil-cats is-reno">
      <FilterRenoTree
        current={currentCat}
        root={renoRoot}
        selectedIds={(state.renoSub ?? "").split(",").filter(Boolean)}
        onToggleLeaf={(id) => onChange("renoSub", toggleRenoLeaf((state.renoSub ?? "").split(","), id))}
      />
    </div>
  ) : currentCat ? (
    <ul className="acil-cats">
      {nav.crumbs.map((item) => (
        <li key={`c-${item.id}`}>{renderNavItem(item, false)}</li>
      ))}
      {nav.items.map((item) => (
        <li key={item.id}>{renderNavItem(item)}</li>
      ))}
    </ul>
  ) : subcats && subcats.length > 0 ? (
    <ul className="acil-cats">
      {subcats.map((ch) => {
        const on = activeCatId === ch.id;
        const n = catCounts?.[ch.id] ?? 0;
        return (
          <li key={ch.id}>
            <Link href={hrefForCategory(ch)} className={on ? "is-on" : ""}>
              {catName(t, ch.id, ch.name)}
              <span>({formatListingCount(n)})</span>
            </Link>
          </li>
        );
      })}
    </ul>
  ) : null;

  const plugins =
    pluginFields.length > 0 ? (
      <>{pluginFields.map((field) => renderExtraField(field, fields, state, onChange, t))}</>
    ) : null;

  const extra =
    moreFields.length > 0 ? (
      <>{moreFields.map((field) => renderExtraField(field, fields, state, onChange, t))}</>
    ) : null;

  return (
    <div className={variant === "sheet" ? "filter-sheet-card acil-side" : "filter-aside acil-side"}>
      {onClose ? (
        <div className="filter-head">
          <h2 className="filter-title">{t("cat.filter")}</h2>
          <button type="button" className="filter-x" onClick={onClose} aria-label={t("common.close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <StdFilterSidebar
        cats={cats}
        extra={extra}
        plugins={plugins}
        city={state.city ?? ""}
        district={state.district ?? ""}
        posted={state.posted ?? ""}
        mappedOnly={state.mappedOnly === "1"}
        draft={draft}
        includeDesc={state.includeDesc === "1"}
        more={more}
        radioName={`std-date-${variant}`}
        onCity={(v) => onChange("city", v)}
        onDistrict={(v) => onChange("district", v)}
        onPosted={(v) => onChange("posted", v)}
        onMappedOnly={(v) => onChange("mappedOnly", v ? "1" : "")}
        onDraft={setDraft}
        onIncludeDesc={(v) => onChange("includeDesc", v ? "1" : "")}
        onMore={() => setMore((v) => !v)}
        onSearch={() => {
          (onSearch ?? (() => onChange("keyword", draft.trim())))();
          onClose?.();
        }}
      />
      <button type="button" className="acil-more" onClick={onClear}>
        {t("flt.clear")}
      </button>
    </div>
  );
}
