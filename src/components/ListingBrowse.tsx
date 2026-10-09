"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { FilterPanel } from "@/components/FilterPanel";
import { FilterSheet } from "@/components/FilterSheet";
import { EstateFilterDialog } from "@/components/EstateFilterDialog";
import { ListingCard } from "@/components/ListingCard";
import { ListingGrid } from "@/components/ListingGrid";
import { ServiceListingRow, serviceRating } from "@/components/ServiceListingRow";
import { CompactListingList, CompactListingRow } from "@/components/CompactListingRow";
import { MobileResultsBar, usePhoneView } from "@/components/MobileResultsBar";
import { useDevice } from "@/context/DeviceContext";
import { catName, useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import {
  categories,
  formatListingCount,
  hrefForCategoryListings,
  isServiceTreeCategory,
  listingMatchesCategory,
  parentOf,
  categoryPath,
  rootOf,
  serviceHubOf,
  type Category,
} from "@/data/categories";
import { FilterChips } from "@/components/FilterChips";
import {
  applyFilterChange,
  countActiveFilters,
  emptyFilterState,
  filterFieldsForCategory,
  hasAdvancedFilters,
  listingMatchesDynamicFilters,
  type FilterState,
} from "@/lib/categoryFilters";
import { filtersFromSearchParams, mergeFilterQuery, parseBrowseMeta } from "@/lib/filterUrl";
import type { Listing } from "@/data/store";
import { sanitizeSearchQuery } from "@/lib/security/inputGuard";
import { ClassifiedSearchTable } from "@/components/ClassifiedSearchTable";
import { isSeaEquipCategoryId } from "@/data/seaEquip";
import { isPublicListing } from "@/lib/categoryCounts";

/** Desktop filter sidebar open/closed preference; kept apart from the filter values themselves. */
const SIDEBAR_KEY = "alsatport-browse-sidebar";
const SIDEBAR_ID = "browse-filter-sidebar";

function useSidebarPreference() {
  const [open, setOpen] = useState(true);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_KEY) === "closed") setOpen(false);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggle = (next: boolean) => {
    setAnimate(true);
    setOpen(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "open" : "closed");
    } catch {
      /* storage unavailable */
    }
  };
  return { open, animate, toggle };
}

export function ListingBrowse({
  category,
  listings,
  heading,
  extra,
  emptyText,
  loading = false,
  serverResult = null,
  mobileTitle,
  onSaveSearch,
  saved = false,
  saveHint,
}: {
  category?: Category | null;
  /** Phone/tablet header title; defaults to the category name. */
  mobileTitle?: string;
  /** Only passed where the saved-search backend can store the search (keyword + city). */
  onSaveSearch?: () => void;
  saved?: boolean;
  saveHint?: string;
  listings: Listing[];
  /** API-filtered result for the current URL filters; `listings` stays unfiltered for option counts. */
  serverResult?: Listing[] | null;
  heading?: ReactNode;
  extra?: ReactNode;
  emptyText: string;
  loading?: boolean;
}) {
  const { t } = useI18n();
  const { user, reviewsFor, listings: catalog } = useApp();
  const { requireAuth } = useAuthModal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const meta = parseBrowseMeta(searchParams);
  const [sort, setSort] = useState(meta.sort);
  const [view, setView] = useState<"grid" | "list">(meta.view);
  const [page, setPage] = useState(meta.page);
  const [filters, setFilters] = useState<FilterState>(() => filtersFromSearchParams(searchParams));
  const [wordDraft, setWordDraft] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCat, setSheetCat] = useState<Category | undefined>();
  const sidebar = useSidebarPreference();
  const { isDesktop } = useDevice();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const compact = mounted && !isDesktop;
  const phoneView = usePhoneView();
  const openBtnRef = useRef<HTMLButtonElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);
  const focusAfterToggle = useRef(false);

  useEffect(() => {
    if (!focusAfterToggle.current) return;
    focusAfterToggle.current = false;
    if (sidebar.open) sideRef.current?.querySelector<HTMLElement>("[data-sidebar-collapse]")?.focus();
    else openBtnRef.current?.focus();
  }, [sidebar.open]);

  const setSidebarOpen = (next: boolean) => {
    focusAfterToggle.current = true;
    sidebar.toggle(next);
  };
  const filterCat = sheetOpen ? (sheetCat ?? category ?? undefined) : category ?? undefined;
  const fields = useMemo(() => filterFieldsForCategory(filterCat), [filterCat]);
  const serviceTree = isServiceTreeCategory(category);
  const hub = serviceHubOf(category);
  const PAGE_SIZE = 24;

  useEffect(() => {
    const leaf =
      category && hub && category.parentId && category.parentId !== hub.id ? category.id : "";
    const next = filtersFromSearchParams(searchParams, leaf ? { renoSub: leaf } : undefined);
    setFilters(next);
    const parsed = parseBrowseMeta(searchParams);
    setSort(parsed.sort);
    setView(parsed.view);
    setPage(parsed.page);
  }, [category?.id, hub?.id, searchParams]);

  const scopedListings = useMemo(() => {
    if (!sheetOpen || !filterCat) return listings;
    if (category && filterCat.id === category.id) return listings;
    return catalog.filter((l) => isPublicListing(l) && listingMatchesCategory(l, filterCat));
  }, [sheetOpen, filterCat, category, listings, catalog]);

  const items = useMemo(() => {
    const source = serverResult && scopedListings === listings ? serverResult : scopedListings;
    let list = source.filter((l) => listingMatchesDynamicFilters(l, filters, fields));
    if (sort === "ucuz") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "pahali") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "yeni") {
      list = [...list].sort((a, b) => (b.postedAt ?? 0) - (a.postedAt ?? 0));
    } else if (sort === "puan") {
      list = [...list].sort((a, b) => {
        const ra = serviceRating(a, reviewsFor(a.sellerId));
        const rb = serviceRating(b, reviewsFor(b.sellerId));
        if (rb.avg !== ra.avg) return rb.avg - ra.avg;
        return rb.count - ra.count;
      });
    } else {
      list = [...list].sort((a, b) => {
        const rank = (x: (typeof list)[number]) => (x.vip ? 2 : 0) + (x.featured ? 1 : 0);
        const d = rank(b) - rank(a);
        if (d) return d;
        return (b.postedAt ?? 0) - (a.postedAt ?? 0);
      });
    }
    return list;
  }, [serverResult, scopedListings, listings, filters, fields, sort, reviewsFor]);

  const active = countActiveFilters(filters);

  const BASIC = new Set([
    "city",
    "district",
    "priceMin",
    "priceMax",
    "subject",
    "level",
    "place",
    "keyword",
    "jobType",
    "exp",
    "education",
    "posted",
    "renoSub",
    "hours24",
    "cond",
    "shopOpts",
    "swap",
    "product",
    "kimden",
    "hasVideo",
    "hasPhoto",
    "mappedOnly",
    "includeDesc",
    "brand",
    "model",
    "trim",
  ]);

  /** Filter changes push a history entry so back/forward walk through them; typing and view tweaks replace. */
  function commit(nextState: FilterState, nextSort = sort, nextView = view, nextPage = 1, mode: "push" | "replace" = "push") {
    const qs = mergeFilterQuery(searchParams, nextState, {
      sira: nextSort,
      gorunum: nextView,
      sayfa: nextPage,
    });
    const href = qs ? `${pathname}?${qs}` : pathname;
    if (mode === "push") router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  }

  function setFilter(key: string, value: string) {
    const estate = (filterCat ?? category) && rootOf(filterCat ?? category!).id === "emlak";
    const field = fields.find((f) => f.key === key || f.pairKey === key);
    if (!user && !BASIC.has(key) && !field && !estate) {
      requireAuth("filter");
      return;
    }
    const typing = field?.kind === "range" || field?.kind === "text";
    setFilters((prev) => {
      const next = applyFilterChange(prev, key, value);
      commit(next, sort, view, 1, typing ? "replace" : "push");
      return next;
    });
  }

  const estateCat = category && hasAdvancedFilters(category) ? category : null;
  const [advOpen, setAdvOpen] = useState(false);
  const estateCountQuery = (draft: FilterState) => {
    const qs = new URLSearchParams(mergeFilterQuery(searchParams, draft));
    qs.delete("filter");
    qs.delete("cat");
    if (estateCat) qs.set("kategori", estateCat.id);
    qs.set("count", "1");
    return qs.toString();
  };

  const sidebarCats = useMemo(() => (category ? [] : categories), [category]);

  const catCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of sidebarCats) {
      map[c.id] = listings.filter((l) => listingMatchesCategory(l, c)).length;
    }
    return map;
  }, [listings, sidebarCats]);

  const filterPanel = (variant: "aside" | "sheet") => {
    const panelCat = variant === "sheet" ? filterCat : category ?? undefined;
    const panelHub = serviceHubOf(panelCat);
    return (
    <FilterPanel
      variant={variant}
      fields={variant === "sheet" ? fields : filterFieldsForCategory(category)}
      state={filters}
      resultCount={items.length}
      onChange={setFilter}
      onClear={() => {
        setFilters(emptyFilterState());
        setWordDraft("");
        commit(emptyFilterState());
      }}
      onClose={variant === "sheet" ? () => setSheetOpen(false) : undefined}
      onCollapse={variant === "aside" ? () => setSidebarOpen(false) : undefined}
      collapseControls={SIDEBAR_ID}
      subcats={sidebarCats}
      activeCatId={panelCat?.id}
      renoRoot={isServiceTreeCategory(panelCat) ? panelHub ?? null : null}
      currentCat={panelCat}
      navRoot={panelCat ? rootOf(panelCat) : undefined}
      catCounts={catCounts}
      listings={variant === "sheet" ? scopedListings : listings}
      onAdvanced={variant === "aside" && estateCat ? () => setAdvOpen(true) : undefined}
      wordDraft={wordDraft}
      onWordDraft={setWordDraft}
      onPickCategory={
        variant === "sheet"
          ? (cat) => setSheetCat(cat)
          : (cat) => router.push(hrefForCategoryListings(cat))
      }
      onSearch={() => {
        setFilter("keyword", sanitizeSearchQuery(wordDraft));
        if (variant === "sheet" && sheetCat && sheetCat.id !== category?.id) {
          router.push(hrefForCategoryListings(sheetCat));
        }
      }}
    />
    );
  };

  const sortOptions = [
    { value: "onerilen", label: t("cat.sort.rec") },
    { value: "yeni", label: serviceTree ? t("cat.sort.adv") : t("cat.sort.new") },
    ...(serviceTree
      ? [{ value: "puan", label: t("cat.sort.rating") }]
      : [
          { value: "ucuz", label: t("cat.sort.asc") },
          { value: "pahali", label: t("cat.sort.desc") },
        ]),
  ];
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const ratingMeta = (l: Listing) => {
    if (!serviceTree) return undefined;
    const { avg, count } = serviceRating(l, reviewsFor(l.sellerId));
    return count > 0 && avg > 0 ? `★ ${avg.toFixed(1)} (${count})` : undefined;
  };

  return (
    <div>
      <div className="browse-heading">
        {serviceTree && category ? (
          <div className="browse-pagehead">
            <h1 className="text-lg font-extrabold tracking-tight text-ink">
              {t("cat.svc.hits", { name: catName(t, category.id, category.name), n: formatListingCount(items.length) })}
            </h1>
          </div>
        ) : (
          heading
        )}
      </div>
      <MobileResultsBar
        title={mobileTitle ?? (category ? catName(t, category.id, category.name) : t("common.search"))}
        titleAsHeading={compact}
        count={items.length}
        onBack={() => {
          if (window.history.length > 1) router.back();
          else {
            const up = category ? parentOf(category) : undefined;
            router.push(up ? hrefForCategoryListings(up) : "/");
          }
        }}
        activeFilters={active}
        onFilter={() => {
          if (estateCat) {
            setAdvOpen(true);
            return;
          }
          setSheetCat(category ?? undefined);
          setSheetOpen(true);
        }}
        sort={sort}
        sortOptions={sortOptions}
        onSort={(next) => {
          setSort(next);
          commit(filters, next, view, 1);
        }}
        view={phoneView.view}
        onToggleView={phoneView.toggle}
        onSave={onSaveSearch}
        saved={saved}
        hint={saveHint}
      />
      {extra}
      {category ? (
        <div className="flt-chips">
          {categoryPath(category).map((c, i, arr) => {
            const last = i === arr.length - 1;
            const up = parentOf(c);
            return (
              <button
                key={c.id}
                type="button"
                className="flt-chip"
                onClick={() => router.push(last ? (up ? hrefForCategoryListings(up) : "/ara") : hrefForCategoryListings(c))}
              >
                {catName(t, c.id, c.name)}
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            );
          })}
        </div>
      ) : null}
      <FilterChips
        fields={fields}
        state={filters}
        onRemove={(key, value) => {
          setFilters((prev) => {
            const rest = value != null ? (prev[key] ?? "").split(",").filter((v) => v && v !== value).join(",") : "";
            const next = applyFilterChange(prev, key, rest);
            const field = fields.find((f) => f.key === key);
            if (field?.pairKey && value == null) next[field.pairKey] = "";
            if (key === "keyword") setWordDraft("");
            commit(next);
            return next;
          });
        }}
        clearLabelKey={estateCat ? "flt.clearAll" : undefined}
        onClear={() => {
          setFilters(emptyFilterState());
          setWordDraft("");
          commit(emptyFilterState());
        }}
      />
      <div className={`browse-layout ${sidebar.open ? "" : "is-side-closed"} ${sidebar.animate ? "is-side-anim" : ""}`}>
        <div ref={sideRef} id={SIDEBAR_ID} className="browse-side" inert={!sidebar.open}>
          {filterPanel("aside")}
        </div>

        <div className="browse-main">
          <div className={`browse-toolbar ${serviceTree ? "is-svc" : ""}`}>
            {sidebar.open ? null : (
              <button
                ref={openBtnRef}
                type="button"
                className="browse-side-open"
                aria-expanded={false}
                aria-controls={SIDEBAR_ID}
                aria-label={t("flt.sidebar.show")}
                onClick={() => setSidebarOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                <span>{t("flt.sidebar.label")}</span>
                {active > 0 ? <span className="browse-filter-badge">{active}</span> : null}
              </button>
            )}
            {serviceTree ? (
              <label className="svc-hours">
                <input
                  type="checkbox"
                  checked={filters.hours24 === "1"}
                  onChange={(e) => setFilter("hours24", e.target.checked ? "1" : "")}
                />
                {t("flt.hours24")}
              </label>
            ) : (
              <p className="acil-found">{t("acil.found", { n: formatListingCount(items.length) })}</p>
            )}
            <div className="browse-toolbar-actions">
              {serviceTree ? null : (
                <div className="browse-view-toggle" role="group" aria-label={t("browse.view")}>
                  <button
                    type="button"
                    className={view === "grid" ? "is-on" : ""}
                    aria-pressed={view === "grid"}
                    onClick={() => {
                      setView("grid");
                      commit(filters, sort, "grid", page);
                    }}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span>{t("browse.view.grid")}</span>
                  </button>
                  <button
                    type="button"
                    className={view === "list" ? "is-on" : ""}
                    aria-pressed={view === "list"}
                    onClick={() => {
                      setView("list");
                      commit(filters, sort, "list", page);
                    }}
                  >
                    <List className="h-4 w-4" />
                    <span>{t("browse.view.list")}</span>
                  </button>
                </div>
              )}
              <select
                value={sort}
                onChange={(e) => {
                  const next = e.target.value;
                  setSort(next);
                  commit(filters, next, view, 1);
                }}
                className="acil-sort"
              >
                <option value="onerilen">{t("cat.sort.rec")}</option>
                <option value="yeni">{serviceTree ? t("cat.sort.adv") : t("cat.sort.new")}</option>
                {serviceTree ? <option value="puan">{t("cat.sort.rating")}</option> : null}
                {serviceTree ? null : <option value="ucuz">{t("cat.sort.asc")}</option>}
                {serviceTree ? null : <option value="pahali">{t("cat.sort.desc")}</option>}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="browse-skel" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="browse-skel-card" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="acil-empty">
              <p>{emptyText}</p>
              {active > 0 ? (
                <button
                  type="button"
                  className="btn-ghost mt-3 h-10 px-4 text-sm"
                  onClick={() => {
                    setFilters(emptyFilterState());
                    setWordDraft("");
                    commit(emptyFilterState());
                  }}
                >
                  {t("search.clearSome")}
                </button>
              ) : null}
            </div>
          ) : compact && phoneView.view === "rows" ? (
            <CompactListingList>
              {pageItems.map((l) => (
                <CompactListingRow key={l.id} listing={l} meta={ratingMeta(l)} />
              ))}
            </CompactListingList>
          ) : compact ? (
            <ListingGrid>
              {pageItems.map((l) => (
                <ListingCard key={l.id} listing={l} compact />
              ))}
            </ListingGrid>
          ) : serviceTree ? (
            <div className="svc-list">
              {pageItems.map((l) => (
                <ServiceListingRow key={l.id} listing={l} reviews={reviewsFor(l.sellerId)} />
              ))}
            </div>
          ) : view === "list" || isSeaEquipCategoryId(category?.id ?? "") ? (
            <ClassifiedSearchTable
              listings={pageItems}
              showProduct={Boolean(
                category && (rootOf(category).id === "pets" || (isSeaEquipCategoryId(category.id) && category.id !== "parts-sea")),
              )}
            />
          ) : (
            <ListingGrid>
              {pageItems.map((l) => (
                <ListingCard key={l.id} listing={l} compact />
              ))}
            </ListingGrid>
          )}
          {!loading && items.length > PAGE_SIZE ? (
            <div className="browse-pager">
              <button
                type="button"
                className="btn-ghost h-10 px-3 text-sm"
                disabled={page <= 1}
                onClick={() => commit(filters, sort, view, page - 1)}
              >
                ←
              </button>
              <span>
                {page}/{Math.ceil(items.length / PAGE_SIZE)}
              </span>
              <button
                type="button"
                className="btn-ghost h-10 px-3 text-sm"
                disabled={page >= Math.ceil(items.length / PAGE_SIZE)}
                onClick={() => commit(filters, sort, view, page + 1)}
              >
                →
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} label={t("cat.filter")}>
        {filterPanel("sheet")}
      </FilterSheet>
      {estateCat ? (
        <EstateFilterDialog
          open={advOpen}
          titleKey={rootOf(estateCat).id === "vasita" ? "flt.adv.titleVehicle" : undefined}
          fields={fields}
          state={filters}
          countQuery={estateCountQuery}
          onClose={() => setAdvOpen(false)}
          onApply={(next) => {
            setAdvOpen(false);
            setFilters(next);
            setWordDraft(next.keyword ?? "");
            commit(next);
          }}
        />
      ) : null}
    </div>
  );
}
