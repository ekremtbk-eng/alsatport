"use client";

import {
  ArrowUpDown,
  Award,
  BadgeCheck,
  Banknote,
  Bath,
  BedDouble,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarClock,
  Car,
  CarFront,
  ChevronLeft,
  Cog,
  Cpu,
  Flag,
  Flame,
  Fuel,
  Gauge,
  GraduationCap,
  Handshake,
  HardDrive,
  HeartHandshake,
  Hourglass,
  Image as ImageIcon,
  Landmark,
  Languages,
  Layers,
  LayoutGrid,
  ListTree,
  Map as MapIcon,
  MapPin,
  MemoryStick,
  Monitor,
  Move,
  Package,
  PaintBucket,
  Palette,
  PawPrint,
  Recycle,
  Repeat,
  Ruler,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sofa,
  Sparkles,
  Store,
  Tag,
  Thermometer,
  Timer,
  Tractor,
  Tv,
  User,
  Users,
  Video,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CategoryDrill } from "@/components/CategoryDrill";
import { CountrySwitch } from "@/components/CountrySwitch";
import { approvedLevel, fieldTitle } from "@/components/FilterPanel";
import { STD_DATE_PRESETS } from "@/components/StdFilterSidebar";
import { useApprovedVehicles } from "@/components/VehicleRequestBox";
import { FilterRow, FilterSwitchRow } from "@/components/mfilter/FilterRow";
import { OptionPicker } from "@/components/mfilter/OptionPicker";
import { RangePicker, rangeLabel } from "@/components/mfilter/RangePicker";
import { catName, useI18n } from "@/context/I18nContext";
import { categoryPath, rootOf, visibleChildren, type Category } from "@/data/categories";
import { isKktcCity, parseCountry, regionNamesFor } from "@/data/locations";
import { mahallelerOf } from "@/data/regionProfiles";
import { districtsOf } from "@/data/turkey";
import { withApprovedOptions } from "@/data/vehicleRequests";
import type { Listing } from "@/data/store";
import {
  countFilterOption,
  rangeSuffix,
  resolvedOptions,
  type FilterField,
  type FilterState,
} from "@/lib/categoryFilters";
import {
  rangeBuckets,
  resolveMobileLayout,
  rowActive,
  rowStateKeys,
  type MobileFilterLayout,
  type MobileFilterRow,
} from "@/lib/mobileFilters";
import { sanitizeSearchQuery } from "@/lib/security/inputGuard";

const ROW_ICONS: Record<string, LucideIcon> = {
  brand: Car,
  model: Layers,
  trim: ListTree,
  priceMin: Banknote,
  yearMin: Calendar,
  kmMin: Gauge,
  location: MapPin,
  fuel: Fuel,
  gear: Cog,
  bodyType: CarFront,
  engineSize: Settings2,
  power: Zap,
  drive: Move,
  color: Palette,
  damage: ShieldAlert,
  paint: PaintBucket,
  equip: Sparkles,
  kimden: User,
  seller: Store,
  posted: CalendarClock,
  urgent: Flame,
  mappedOnly: MapIcon,
  keyword: Search,
  category: LayoutGrid,
  steering: Flag,
  origin: Flag,
  importStatus: Flag,
  customs: Flag,
  kktcReg: Flag,
  plateType: Flag,
  firstReg: Flag,
  engine: Settings2,
  body: CarFront,
  service: Wrench,
  subject: GraduationCap,
  level: GraduationCap,
  education: GraduationCap,
  jobType: Briefcase,
  sector: Building2,
  exp: Award,
  place: MapPin,
  helpType: HeartHandshake,
  helpGender: Users,
  helpLang: Languages,
  species: PawPrint,
  breed: PawPrint,
  sex: Users,
  ageMin: Hourglass,
  petProduct: Package,
  product: Package,
  partBrand: Tag,
  usedPart: Recycle,
  cond: BadgeCheck,
  swap: Repeat,
  warranty: ShieldCheck,
  shopOpts: ShoppingBag,
  hasPhoto: ImageIcon,
  hasVideo: Video,
  size: Ruler,
  storage: HardDrive,
  ram: MemoryStick,
  cpu: Cpu,
  gpu: Cpu,
  screen: Monitor,
  os: Smartphone,
  tvSize: Tv,
  tvRes: Tv,
  era: Hourglass,
  hoursMin: Timer,
  tractor: Tractor,
  rooms: BedDouble,
  bath: Bath,
  sqmMin: Ruler,
  sqmNetMin: Ruler,
  homeType: Building,
  deal: Handshake,
  zoning: Landmark,
  age: Hourglass,
  heat: Thermometer,
  floor: ArrowUpDown,
  furnished: Sofa,
  duesMin: Banknote,
};

type Screen =
  | { kind: "pick"; key: string }
  | { kind: "range"; key: string }
  | { kind: "location" }
  | { kind: "loc-pick"; key: "city" | "district" | "neighborhood" }
  | { kind: "posted" }
  | { kind: "text"; key: string }
  | { kind: "category" };

const SUB_KEY: Record<string, string> = { "loc-pick": "location" };

function screenRow(s: Screen) {
  if (s.kind === "pick" || s.kind === "range" || s.kind === "text") return s.key;
  return SUB_KEY[s.kind] ?? s.kind;
}

/**
 * Phone/tablet filter panel: "Hızlı Filtre" rows first, the rest grouped under "Tüm Filtreler".
 * Each row opens its own screen inside the same sheet; every change applies at once so the footer count is live.
 */
export function QuickFilterPanel({
  category,
  layout,
  fields,
  state,
  listings,
  resultCount,
  onSet,
  onClear,
  onApply,
  onClose,
  onPickCategory,
}: {
  category: Category;
  layout: MobileFilterLayout;
  fields: FilterField[];
  state: FilterState;
  listings: Listing[];
  resultCount: number;
  onSet: (pairs: [string, string][]) => void;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
  onPickCategory: (cat: Category) => void;
}) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<"quick" | "all">("quick");
  const [stack, setStack] = useState<Screen[]>([]);
  const [draft, setDraft] = useState(state.keyword ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<string | null>(null);
  const approved = useApprovedVehicles(fields.some((f) => f.key === "brand" && f.catalogKind));
  const resolved = useMemo(() => resolveMobileLayout(layout, fields, state), [layout, fields, state]);
  const screen = stack[stack.length - 1];
  const counting = listings.length > 0 && listings.length <= 800;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (returnTo.current) {
      root.querySelector<HTMLElement>(`[data-row="${returnTo.current}"]`)?.focus();
      returnTo.current = null;
      return;
    }
    if (stack.length) root.querySelector<HTMLElement>(".qf-title")?.focus();
  }, [stack]);

  const push = (s: Screen) => setStack((prev) => [...prev, s]);
  const pop = () =>
    setStack((prev) => {
      const top = prev[prev.length - 1];
      if (top && prev.length === 1) returnTo.current = screenRow(top);
      else if (top?.kind === "loc-pick") returnTo.current = top.key;
      return prev.slice(0, -1);
    });
  const set = (key: string, value: string) => onSet([[key, value]]);

  const fieldOf = (key: string) => fields.find((f) => f.key === key);
  const jobs = rootOf(category).id === "jobs";
  const country = parseCountry(state.country);
  const kktc = country === "KKTC" || isKktcCity(state.city ?? "");
  const anyPlace = country === "KKTC" ? t("loc.kktcAll") : country === "TR" ? t("loc.trAll") : t("loc.allPlaces");

  const rowTitle = (row: MobileFilterRow) => {
    if (row.key === "location") return t("acil.address");
    if (row.key === "posted") return t("acil.date");
    if (row.key === "mappedOnly") return t("acil.mapOnly");
    if (row.key === "keyword") return t("acil.word");
    if (row.key === "category") return t("flt.cat");
    if (row.key === "priceMin") return jobs ? t("mf.salary") : t("flt.price");
    return fieldTitle(t, row.field?.labelKey ?? row.key);
  };

  const summary = (row: MobileFilterRow): string => {
    if (row.key === "location") {
      const place = [state.city, state.district, state.neighborhood].filter(Boolean).join(" / ");
      return place || (country ? anyPlace : "");
    }
    if (row.key === "posted") {
      const p = STD_DATE_PRESETS.find((x) => x.id === (state.posted ?? ""));
      return state.posted && p ? t(p.labelKey) : "";
    }
    if (row.key === "keyword") return state.keyword ? `“${state.keyword}”` : "";
    if (row.key === "category") return categoryPath(category).map((c) => catName(t, c.id, c.name)).join(" › ");
    const f = row.field;
    if (!f) return "";
    if (f.kind === "range" && f.pairKey) {
      const text = rangeLabel(f.key, state[f.key] ?? "", state[f.pairKey] ?? "", rangeSuffix(f, state) ?? "", locale, t);
      if (f.key === "priceMin" && state.currency) return text ? `${text} · ${state.currency}` : state.currency;
      return text;
    }
    return (state[f.key] ?? "").split(",").filter(Boolean).join(", ");
  };

  const lockedHint = (f: FilterField) => {
    if (!f.dependsOn || state[f.dependsOn]) return undefined;
    const hints: Record<string, string> = {
      brand: "flt.brandFirst",
      model: "flt.modelFirst",
      trim: "flt.trimFirst",
      series: "flt.trimFirst",
      engine: "flt.engineFirst",
      body: "flt.bodyFirst",
      district: "flt.districtFirst",
    };
    return t(hints[f.dependsOn] ?? "flt.cityFirst");
  };

  const open = (row: MobileFilterRow) => {
    if (row.key === "location") return push({ kind: "location" });
    if (row.key === "posted") return push({ kind: "posted" });
    if (row.key === "keyword") {
      setDraft(state.keyword ?? "");
      return push({ kind: "text", key: row.key });
    }
    if (row.key === "category") return push({ kind: "category" });
    const f = row.field;
    if (f?.kind === "range") return push({ kind: "range", key: f.key });
    if (f?.kind === "text") {
      setDraft(state[f.key] ?? "");
      return push({ kind: "text", key: f.key });
    }
    push({ kind: "pick", key: row.key });
  };

  const renderRow = (row: MobileFilterRow) => {
    const icon = row.key === "brand" && rootOf(category).id !== "vasita" ? Tag : (ROW_ICONS[row.key] ?? SlidersHorizontal);
    const title = rowTitle(row);
    if (row.key === "mappedOnly" || row.field?.kind === "toggle") {
      const on = state[row.key] === "1";
      return (
        <FilterSwitchRow key={row.key} rowKey={row.key} icon={icon} label={title} on={on} onToggle={() => set(row.key, on ? "" : "1")} />
      );
    }
    const f = row.field;
    const locked = f ? Boolean(f.dependsOn && !state[f.dependsOn]) : false;
    const placeholder = locked && f ? lockedHint(f) ?? "" : f?.kind === "range" ? t("mf.minMax") : row.key === "location" ? anyPlace : t("flt.any");
    return (
      <FilterRow
        key={row.key}
        rowKey={row.key}
        icon={icon}
        label={title}
        value={summary(row)}
        placeholder={placeholder}
        disabled={locked}
        onOpen={() => open(row)}
      />
    );
  };

  const quickActive = resolved.quick.filter((r) => rowActive(r, state)).length;
  const allActive = resolved.groups.reduce((n, g) => n + g.rows.filter((r) => rowActive(r, state)).length, 0);

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = tab === "quick" ? "all" : "quick";
    const pick = e.key === "Home" ? "quick" : e.key === "End" ? "all" : next;
    setTab(pick);
    rootRef.current?.querySelector<HTMLElement>(`#qf-tab-${pick}`)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && stack.length && !e.defaultPrevented) {
      e.preventDefault();
      pop();
    }
  };

  const head = (title: string, back: boolean) => (
    <div className="filter-head qf-head">
      {back ? (
        <button type="button" className="qf-icon-btn" onClick={pop} aria-label={t("common.back")}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      ) : null}
      <h2 className="filter-title qf-title" tabIndex={-1}>
        {title}
      </h2>
      <button type="button" className="filter-x qf-icon-btn" onClick={onClose} aria-label={t("common.close")}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const foot = (clearLabel: string, clear: () => void, apply: () => void, applyLabel: ReactNode, clearDisabled = false) => (
    <div className="filter-sheet-foot qf-foot sticky bottom-0">
      <div className="flt-apply-row is-sheet">
        <button type="button" className="flt-clear-btn" onClick={clear} disabled={clearDisabled}>
          {clearLabel}
        </button>
        <button type="button" className="acil-search-btn" onClick={apply}>
          {applyLabel}
        </button>
      </div>
    </div>
  );

  const body = (children: ReactNode) => (
    <div data-filter-scroll className="filter-sheet-body qf-body min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {children}
    </div>
  );

  const showLabel = (
    <span className="qf-apply-label">
      <span>{t("mf.show")}</span>
      <span className="qf-apply-n">{t("browse.count", { n: resultCount.toLocaleString("tr-TR") })}</span>
    </span>
  );

  const clearRow = (keys: string[]) => onSet(keys.map((k) => [k, ""] as [string, string]));
  const backFoot = (keys: string[]) =>
    foot(t("flt.clearShort"), () => clearRow(keys), pop, t("mf.apply"), !keys.some((k) => state[k]));

  let content: ReactNode;
  if (!screen) {
    const rows = tab === "quick" ? resolved.quick : null;
    content = (
      <>
        {head(t("cat.filter"), false)}
        <div className="qf-tabs" role="tablist" aria-label={t("cat.filter")} onKeyDown={onTabKey}>
          {(["quick", "all"] as const).map((id) => {
            const n = id === "quick" ? quickActive : allActive;
            return (
              <button
                key={id}
                id={`qf-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-controls="qf-tabpanel"
                tabIndex={tab === id ? 0 : -1}
                className={`qf-tab ${tab === id ? "is-on" : ""}`}
                onClick={() => setTab(id)}
              >
                {t(id === "quick" ? "mf.quick" : "mf.all")}
                {n > 0 ? <span className="qf-tab-n">{n}</span> : null}
              </button>
            );
          })}
        </div>
        {body(
          <div id="qf-tabpanel" role="tabpanel" aria-labelledby={`qf-tab-${tab}`}>
            {rows ? (
              <>
                <div className="qf-rows">{rows.map(renderRow)}</div>
                <button type="button" className="qf-more" onClick={() => setTab("all")}>
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  {t("flt.adv.more")}
                </button>
              </>
            ) : (
              resolved.groups.map((g) => (
                <section key={g.id} className="qf-group" aria-labelledby={`qf-g-${g.id}`}>
                  <h3 id={`qf-g-${g.id}`} className="qf-group-title">
                    {t(g.labelKey)}
                  </h3>
                  <div className="qf-rows">{g.rows.map(renderRow)}</div>
                </section>
              ))
            )}
          </div>,
        )}
        {foot(t("flt.clearShort"), onClear, onApply, showLabel)}
      </>
    );
  } else if (screen.kind === "pick") {
    const f = fieldOf(screen.key)!;
    const multi = f.kind === "multi" || f.key === "kimden" || Boolean(f.multiPick);
    const level = approvedLevel(f);
    const base = f.options && multi ? f.options : resolvedOptions(f, state);
    const options = level && f.catalogKind ? withApprovedOptions(level, base, approved, f.catalogKind, state) : base;
    const locked = lockedHint(f);
    const counts =
      counting && !locked
        ? Object.fromEntries(
            options.map((o) => [o, countFilterOption(listings, fields, multi ? { ...state, [f.key]: "" } : state, f.key, o) ?? 0]),
          )
        : undefined;
    const modelField = f.key === "brand" ? fieldOf("model") : undefined;
    content = (
      <>
        {head(fieldTitle(t, f.labelKey), true)}
        {body(
          <OptionPicker
            key={f.key}
            label={fieldTitle(t, f.labelKey)}
            options={options}
            value={state[f.key] ?? ""}
            multi={multi}
            counts={counts}
            hideEmpty={!f.searchable}
            anyLabel={t("flt.any")}
            lockedHint={locked}
            searchable={f.searchable || options.length > 8}
            onPick={(v) => {
              set(f.key, v);
              if (multi) return;
              if (v && modelField && stack.length === 1) {
                setStack([{ kind: "pick", key: modelField.key }]);
                return;
              }
              pop();
            }}
          />,
        )}
        {backFoot([f.key])}
      </>
    );
  } else if (screen.kind === "range") {
    const f = fieldOf(screen.key)!;
    const pair = f.pairKey ? fieldOf(f.pairKey) : undefined;
    const keys = rowStateKeys({ key: f.key, field: f });
    content = (
      <>
        {head(f.key === "priceMin" ? (jobs ? t("mf.salary") : t("mf.priceRange")) : fieldTitle(t, f.labelKey), true)}
        {body(pair ? <RangePicker minField={f} maxField={pair} state={state} buckets={rangeBuckets(f.key, category)} onSet={onSet} /> : null)}
        {backFoot(keys)}
      </>
    );
  } else if (screen.kind === "location") {
    const hoods = state.city && state.district ? mahallelerOf(state.city, state.district) : [];
    const locRow = (key: "city" | "district" | "neighborhood", label: string, disabled: boolean, hint: string) => (
      <FilterRow
        rowKey={key}
        icon={MapPin}
        label={label}
        value={state[key] ?? ""}
        placeholder={disabled ? hint : t("flt.any")}
        disabled={disabled}
        onOpen={() => push({ kind: "loc-pick", key })}
      />
    );
    content = (
      <>
        {head(t("acil.address"), true)}
        {body(
          <div className="qf-loc">
            <div className="qf-block">
              <p className="qf-block-title">{t("loc.country")}</p>
              <CountrySwitch value={state.country ?? ""} onChange={(v) => set("country", v)} />
            </div>
            <div className="qf-rows">
              {locRow("city", kktc ? t("loc.kktcRegion") : t("acil.il"), false, "")}
              {locRow("district", kktc ? t("loc.kktcPlace") : t("acil.ilce"), !state.city, t("flt.cityFirst"))}
              {hoods.length > 0 || state.neighborhood ? locRow("neighborhood", t("post.neighborhood"), !state.district, "") : null}
            </div>
          </div>,
        )}
        {backFoot(["country", "city", "district", "neighborhood"])}
      </>
    );
  } else if (screen.kind === "loc-pick") {
    const key = screen.key;
    const options =
      key === "city"
        ? regionNamesFor(country)
        : key === "district"
          ? state.city
            ? districtsOf(state.city)
            : []
          : state.city && state.district
            ? mahallelerOf(state.city, state.district)
            : [];
    const label = key === "city" ? (kktc ? t("loc.kktcRegion") : t("acil.il")) : key === "district" ? (kktc ? t("loc.kktcPlace") : t("acil.ilce")) : t("post.neighborhood");
    content = (
      <>
        {head(label, true)}
        {body(
          <OptionPicker
            key={key}
            label={label}
            options={options}
            value={state[key] ?? ""}
            anyLabel={key === "city" ? anyPlace : t("flt.any")}
            searchable
            onPick={(v) => {
              set(key, v);
              pop();
            }}
          />,
        )}
        {backFoot([key])}
      </>
    );
  } else if (screen.kind === "posted") {
    content = (
      <>
        {head(t("acil.date"), true)}
        {body(
          <div role="radiogroup" aria-label={t("acil.date")} className="qf-opts">
            {STD_DATE_PRESETS.map((p) => {
              const on = (state.posted ?? "") === p.id;
              return (
                <button
                  key={p.id || "any"}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`qf-opt ${on ? "is-on" : ""}`}
                  onClick={() => {
                    set("posted", p.id);
                    pop();
                  }}
                >
                  <span className="qf-radio" aria-hidden />
                  <span className="qf-opt-name">{t(p.labelKey)}</span>
                </button>
              );
            })}
          </div>,
        )}
        {backFoot(["posted"])}
      </>
    );
  } else if (screen.kind === "text") {
    const key = screen.key;
    const isWord = key === "keyword";
    const label = isWord ? t("acil.word") : fieldTitle(t, fieldOf(key)?.labelKey ?? key);
    const keys = isWord ? ["keyword", "includeDesc"] : [key];
    const commitWord = () => {
      set(key, sanitizeSearchQuery(draft));
      pop();
    };
    content = (
      <>
        {head(label, true)}
        {body(
          <form
            className="qf-loc"
            onSubmit={(e) => {
              e.preventDefault();
              commitWord();
            }}
          >
            <label className="qf-field">
              <span className="qf-field-label">{label}</span>
              <span className="qf-field-box">
                <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                <input
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  maxLength={80}
                  value={draft}
                  placeholder={isWord ? t("acil.wordPh") : t("flt.keywordPh")}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </span>
            </label>
            {isWord ? (
              <FilterSwitchRow
                rowKey="includeDesc"
                icon={ListTree}
                label={t("acil.inclDesc")}
                on={state.includeDesc === "1"}
                onToggle={() => set("includeDesc", state.includeDesc === "1" ? "" : "1")}
              />
            ) : null}
          </form>,
        )}
        {foot(
          t("flt.clearShort"),
          () => {
            setDraft("");
            clearRow(keys);
          },
          commitWord,
          t("mf.apply"),
          !draft && !keys.some((k) => state[k]),
        )}
      </>
    );
  } else {
    const navRoot = rootOf(category);
    const roots = visibleChildren(navRoot).length ? visibleChildren(navRoot) : [navRoot];
    content = (
      <>
        {head(t("flt.cat.pick"), true)}
        {body(
          <CategoryDrill
            roots={roots}
            selected={category}
            stay
            onPick={(cat) => {
              onPickCategory(cat);
              pop();
            }}
            onBackOut={pop}
          />,
        )}
      </>
    );
  }

  return (
    <div ref={rootRef} className="qf contents" onKeyDown={onKeyDown}>
      {content}
    </div>
  );
}
