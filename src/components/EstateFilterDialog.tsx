"use client";

import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FilterSheet } from "@/components/FilterSheet";
import { SearchSelect } from "@/components/SearchSelect";
import { STD_DATE_PRESETS } from "@/components/StdFilterSidebar";
import { useI18n } from "@/context/I18nContext";
import {
  ESTATE_FILTER_GROUPS,
  applyFilterChange,
  districtOptions,
  resolvedOptions,
  type EstateFilterGroup,
  type FilterField,
  type FilterState,
} from "@/lib/categoryFilters";
import { apiGet } from "@/lib/security/client";

type T = (key: string, vars?: Record<string, string | number>) => string;

/** Keys the dialog owns besides the schema fields; everything else in the URL state is left untouched. */
const EXTRA_KEYS: Partial<Record<EstateFilterGroup, string[]>> = { basic: ["posted"], other: ["keyword"] };

const LOCK_HINTS: Record<string, string> = { district: "flt.districtFirst", brand: "flt.brandFirst", model: "flt.modelFirst" };

function fold(s: string) {
  return s.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function splitList(value?: string) {
  return (value ?? "").split(",").filter(Boolean);
}

export function estateDialogKeys(fields: FilterField[]) {
  const keys = new Set<string>(["posted", "keyword"]);
  for (const f of fields) {
    keys.add(f.key);
    if (f.pairKey) keys.add(f.pairKey);
  }
  return keys;
}

/** Selected values per estate group, counting a min/max pair once. */
export function estateGroupCounts(fields: FilterField[], state: FilterState) {
  const out = {} as Record<EstateFilterGroup, number>;
  for (const g of ESTATE_FILTER_GROUPS) out[g] = 0;
  for (const f of fields) {
    if (!f.group) continue;
    if (f.kind === "range" && f.key.endsWith("Max")) continue;
    if (state[f.key] || (f.pairKey && state[f.pairKey])) out[f.group] += 1;
  }
  for (const [g, keys] of Object.entries(EXTRA_KEYS) as [EstateFilterGroup, string[]][]) {
    for (const k of keys) if (state[k]) out[g] += 1;
  }
  return out;
}

function normalizeRanges(fields: FilterField[], state: FilterState): FilterState {
  const next = { ...state };
  for (const f of fields) {
    if (f.kind !== "range" || !f.pairKey || !f.key.endsWith("Min")) continue;
    const lo = next[f.key];
    const hi = next[f.pairKey];
    if (lo && hi && Number(lo) > Number(hi)) {
      next[f.key] = hi;
      next[f.pairKey] = lo;
    }
  }
  return next;
}

function RangeControl({ field, maxKey, draft, set, t }: { field: FilterField; maxKey: string; draft: FilterState; set: (k: string, v: string) => void; t: T }) {
  const title = t(field.labelKey);
  return (
    <div className="adv-range">
      {[field.key, maxKey].map((key, i) => (
        <label key={key} className="adv-range-cell">
          <span className="adv-range-k">{i === 0 ? t("flt.min") : t("flt.max")}</span>
          <span className="adv-range-box">
            <input
              inputMode="numeric"
              maxLength={12}
              aria-label={`${title} ${i === 0 ? t("flt.min") : t("flt.max")}`}
              value={draft[key] ?? ""}
              onChange={(e) => set(key, e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
            />
            {field.suffix ? <span className="adv-range-sfx">{field.suffix}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

function ChoiceControl({
  field,
  options,
  draft,
  set,
  grid,
}: {
  field: FilterField;
  options: string[];
  draft: FilterState;
  set: (k: string, v: string) => void;
  grid?: boolean;
}) {
  const picked = new Set(splitList(draft[field.key]));
  return (
    <div className={grid ? "adv-checks" : "adv-chips"} role="group">
      {options.map((o) => {
        const on = picked.has(o);
        return (
          <button
            key={o}
            type="button"
            className={`${grid ? "adv-check" : "adv-chip"} ${on ? "is-on" : ""}`}
            aria-pressed={on}
            onClick={() => {
              const next = new Set(picked);
              if (on) next.delete(o);
              else next.add(o);
              set(field.key, (field.options ?? options).filter((x) => next.has(x)).join(","));
            }}
          >
            {grid ? <span className="adv-box" aria-hidden /> : null}
            {o}
          </button>
        );
      })}
    </div>
  );
}

function FieldBlock({
  field,
  draft,
  set,
  t,
  needle,
}: {
  field: FilterField;
  draft: FilterState;
  set: (k: string, v: string) => void;
  t: T;
  needle: string;
}) {
  const title = t(field.labelKey);
  const titleHit = !needle || fold(title).includes(needle);
  let body: React.ReactNode = null;

  if (field.kind === "range" && field.pairKey) {
    body = <RangeControl field={field} maxKey={field.pairKey} draft={draft} set={set} t={t} />;
  } else if (field.kind === "city" || field.kind === "district" || field.searchable) {
    const locked = Boolean(field.dependsOn && !draft[field.dependsOn]);
    const options = field.kind === "district" ? districtOptions(draft.city) : resolvedOptions(field, draft);
    body = (
      <SearchSelect
        label={title}
        hideLabel
        value={draft[field.key] ?? ""}
        options={options}
        disabled={locked}
        placeholder={locked ? t(LOCK_HINTS[field.dependsOn ?? ""] ?? "flt.cityFirst") : t("flt.any")}
        anyLabel={t("flt.any")}
        onChange={(v) => set(field.key, v)}
      />
    );
  } else if (field.kind === "toggle") {
    const on = draft[field.key] === "1";
    body = (
      <button type="button" className={`adv-check is-solo ${on ? "is-on" : ""}`} aria-pressed={on} onClick={() => set(field.key, on ? "" : "1")}>
        <span className="adv-box" aria-hidden />
        {title}
      </button>
    );
  } else if (field.kind === "text") {
    body = (
      <input
        className="adv-text"
        aria-label={title}
        maxLength={80}
        value={draft[field.key] ?? ""}
        onChange={(e) => set(field.key, e.target.value)}
      />
    );
  } else {
    const all = field.options ?? resolvedOptions(field, draft);
    const picked = new Set(splitList(draft[field.key]));
    const options = titleHit ? all : all.filter((o) => picked.has(o) || fold(o).includes(needle));
    body = <ChoiceControl field={field} options={options} draft={draft} set={set} grid={field.kind === "multi"} />;
  }

  return (
    <section className="adv-field" aria-label={title}>
      <h4 className="adv-field-title">{title}</h4>
      {body}
    </section>
  );
}

function fieldMatches(field: FilterField, t: T, needle: string) {
  if (!needle) return true;
  if (fold(t(field.labelKey)).includes(needle)) return true;
  return (field.options ?? []).some((o) => fold(o).includes(needle));
}

export function EstateFilterDialog({
  open,
  fields,
  state,
  countQuery,
  onApply,
  onClose,
  titleKey = "flt.adv.title",
}: {
  open: boolean;
  fields: FilterField[];
  state: FilterState;
  titleKey?: string;
  /** Query string for `/api/listings` (with `count=1`) for a draft state; the same filter path as the results. */
  countQuery: (draft: FilterState) => string;
  onApply: (next: FilterState) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<FilterState>(state);
  const [group, setGroup] = useState<EstateFilterGroup>("basic");
  const [step, setStep] = useState<"groups" | "options">("groups");
  const [query, setQuery] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(state);
    setQuery("");
    setStep("groups");
    // Reset only when the dialog opens; later URL changes must not wipe the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visible = useMemo(() => fields.filter((f) => f.group && !(f.kind === "range" && f.key.endsWith("Max"))), [fields]);
  const groups = useMemo(
    () => ESTATE_FILTER_GROUPS.filter((g) => visible.some((f) => f.group === g) || EXTRA_KEYS[g]),
    [visible],
  );
  const counts = estateGroupCounts(fields, draft);
  const needle = fold(query.trim());
  const dateTitle = t("flt.posted");
  const wordTitle = t("flt.keyword");
  const dateHit = !needle || fold(dateTitle).includes(needle);
  const wordHit = !needle || fold(wordTitle).includes(needle);
  const matchGroups = needle
    ? groups.filter(
        (g) =>
          visible.some((f) => f.group === g && fieldMatches(f, t, needle)) ||
          (g === "basic" && dateHit) ||
          (g === "other" && wordHit),
      )
    : groups;

  const qs = open ? countQuery(normalizeRanges(fields, draft)) : "";
  useEffect(() => {
    if (!qs) return;
    let cancelled = false;
    setCounting(true);
    const timer = setTimeout(() => {
      void apiGet<{ ok?: boolean; count?: number }>(`/api/listings?${qs}`)
        .then((res) => {
          if (cancelled) return;
          setCount(res.ok && typeof res.count === "number" ? res.count : null);
          setCounting(false);
        })
        .catch(() => {
          if (cancelled) return;
          setCount(null);
          setCounting(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [qs]);

  const set = (key: string, value: string) => setDraft((prev) => applyFilterChange(prev, key, value));
  const clear = () => {
    const owned = estateDialogKeys(fields);
    setDraft((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !owned.has(k))));
  };
  const apply = () => onApply(normalizeRanges(fields, draft));

  const renderGroup = (g: EstateFilterGroup) => {
    const list = visible.filter((f) => f.group === g && fieldMatches(f, t, needle));
    return (
      <>
        {list.map((f) => (
          <FieldBlock key={f.key} field={f} draft={draft} set={set} t={t} needle={needle} />
        ))}
        {g === "basic" && dateHit ? (
          <section className="adv-field" aria-label={dateTitle}>
            <h4 className="adv-field-title">{dateTitle}</h4>
            <div className="adv-chips" role="radiogroup" aria-label={dateTitle}>
              {STD_DATE_PRESETS.map((p) => {
                const on = (draft.posted ?? "") === p.id;
                return (
                  <button
                    key={p.id || "any"}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className={`adv-chip ${on ? "is-on" : ""}`}
                    onClick={() => set("posted", p.id)}
                  >
                    {t(p.labelKey)}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
        {g === "other" && wordHit ? (
          <section className="adv-field" aria-label={wordTitle}>
            <h4 className="adv-field-title">{wordTitle}</h4>
            <input
              className="adv-text"
              aria-label={wordTitle}
              maxLength={80}
              value={draft.keyword ?? ""}
              placeholder={t("acil.wordPh")}
              onChange={(e) => set("keyword", e.target.value)}
            />
          </section>
        ) : null}
      </>
    );
  };

  const showLabel = counting
    ? t("flt.adv.counting")
    : count != null
      ? t("flt.adv.show", { n: count.toLocaleString("tr-TR") })
      : t("flt.adv.showAny");

  return (
    <FilterSheet open={open} onClose={onClose} label={t(titleKey)} className="is-adv">
      <div className="adv" data-step={needle ? "options" : step}>
        <header className="adv-head">
          <button
            type="button"
            className="adv-back"
            aria-label={t("common.back")}
            onClick={() => (step === "options" && !needle ? setStep("groups") : onClose())}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="adv-head-txt">
            <h2>{t(titleKey)}</h2>
            <p aria-live="polite">{count != null && !counting ? t("flt.adv.resultN", { n: count.toLocaleString("tr-TR") }) : "\u00a0"}</p>
          </div>
          <button type="button" className="adv-x" aria-label={t("common.close")} onClick={onClose}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <label className="adv-search">
          <Search className="h-4 w-4" aria-hidden />
          <input
            type="search"
            value={query}
            maxLength={40}
            placeholder={t("flt.adv.search")}
            aria-label={t("flt.adv.search")}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="adv-body">
          <nav className="adv-nav" data-filter-scroll aria-label={t("flt.adv.groups")}>
            {matchGroups.map((g) => (
              <button
                key={g}
                type="button"
                className={`adv-nav-btn ${g === group && !needle ? "is-on" : ""}`}
                aria-current={g === group && !needle ? "true" : undefined}
                onClick={() => {
                  setGroup(g);
                  setQuery("");
                  setStep("options");
                }}
              >
                <span>{t(`flt.grp.${g}`)}</span>
                {counts[g] ? <span className="adv-nav-n">{counts[g]}</span> : null}
                <ChevronRight className="adv-nav-go h-4 w-4" aria-hidden />
              </button>
            ))}
            {needle && !matchGroups.length ? <p className="adv-empty">{t("flt.adv.none")}</p> : null}
          </nav>
          <div className="adv-pane" data-filter-scroll>
            {needle ? (
              matchGroups.length ? (
                matchGroups.map((g) => (
                  <div key={g} className="adv-pane-group">
                    <h3 className="adv-pane-title">{t(`flt.grp.${g}`)}</h3>
                    {renderGroup(g)}
                  </div>
                ))
              ) : (
                <p className="adv-empty">{t("flt.adv.none")}</p>
              )
            ) : (
              <div className="adv-pane-group">
                <h3 className="adv-pane-title">{t(`flt.grp.${group}`)}</h3>
                {renderGroup(group)}
              </div>
            )}
          </div>
        </div>
        <footer className="adv-foot">
          <button type="button" className="adv-btn is-ghost" onClick={clear}>
            {t("flt.clearShort")}
          </button>
          <button type="button" className="adv-btn is-ghost" onClick={onClose}>
            {t("flt.adv.cancel")}
          </button>
          <button type="button" className="adv-btn is-go" onClick={apply} aria-busy={counting}>
            {showLabel}
          </button>
        </footer>
      </div>
    </FilterSheet>
  );
}
