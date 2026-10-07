"use client";

import { useEffect, useState } from "react";
import { ArrowUpDown, Bookmark, BookmarkCheck, ChevronLeft, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { formatListingCount } from "@/data/categories";

export type PhoneView = "rows" | "cards";

const VIEW_KEY = "alsatport-mobile-view";

/** Phone/tablet result layout preference; kept out of the URL so desktop `gorunum` links stay unchanged. */
export function usePhoneView() {
  const [view, setView] = useState<PhoneView>("rows");
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "cards") setView("cards");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggle = () =>
    setView((prev) => {
      const next = prev === "rows" ? "cards" : "rows";
      try {
        localStorage.setItem(VIEW_KEY, next);
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  return { view, toggle };
}

/** Shared phone/tablet header for every result list: back, title, live count, then Filter | Sort | View | Save. */
export function MobileResultsBar({
  title,
  titleAsHeading = false,
  count,
  onBack,
  activeFilters,
  onFilter,
  sort,
  sortOptions,
  onSort,
  view,
  onToggleView,
  onSave,
  saved = false,
  hint,
}: {
  title: string;
  /** True once the page is known to be on phone/tablet, where the desktop heading (and its h1) is hidden. */
  titleAsHeading?: boolean;
  count: number;
  onBack: () => void;
  activeFilters: number;
  onFilter: () => void;
  sort: string;
  sortOptions: { value: string; label: string }[];
  onSort: (value: string) => void;
  view: PhoneView;
  onToggleView: () => void;
  onSave?: () => void;
  saved?: boolean;
  hint?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="mres">
      <div className="mres-head">
        <button type="button" className="mres-back" onClick={onBack} aria-label={t("common.back")}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="mres-title">
          {titleAsHeading ? <h1 className="mres-name">{title}</h1> : <p className="mres-name">{title}</p>}
          <p className="mres-count">{t("browse.count", { n: formatListingCount(count) })}</p>
        </div>
      </div>
      <div className="mres-tools" role="toolbar" aria-label={title}>
        <button type="button" className="mres-tool" onClick={onFilter}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          <span>{t("cat.filter")}</span>
          {activeFilters > 0 ? <span className="mres-badge">{activeFilters}</span> : null}
        </button>
        <label className="mres-tool">
          <ArrowUpDown className="h-4 w-4" aria-hidden />
          <span>{t("browse.sort")}</span>
          <select value={sort} onChange={(e) => onSort(e.target.value)} aria-label={t("browse.sort")}>
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="mres-tool"
          onClick={onToggleView}
          aria-label={view === "rows" ? t("browse.view.cards") : t("browse.view.rows")}
        >
          {view === "rows" ? <LayoutGrid className="h-4 w-4" aria-hidden /> : <List className="h-4 w-4" aria-hidden />}
          <span>{t("browse.view")}</span>
        </button>
        {onSave ? (
          <button type="button" className={`mres-tool ${saved ? "is-on" : ""}`} onClick={onSave} aria-pressed={saved}>
            {saved ? <BookmarkCheck className="h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}
            <span>{saved ? t("common.saved") : t("common.saveSearch")}</span>
          </button>
        ) : null}
      </div>
      {hint ? <p className="mres-hint">{hint}</p> : null}
    </div>
  );
}
