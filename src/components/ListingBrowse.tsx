"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { FilterPanel } from "@/components/FilterPanel";
import { ListingCard } from "@/components/ListingCard";
import { ListingGrid } from "@/components/ListingGrid";
import { ServiceListingRow, serviceRating } from "@/components/ServiceListingRow";
import { catName, useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import {
  categories,
  formatListingCount,
  isServiceTreeCategory,
  listingMatchesCategory,
  rootOf,
  serviceHubOf,
  type Category,
} from "@/data/categories";
import {
  applyFilterChange,
  countActiveFilters,
  emptyFilterState,
  filterFieldsForCategory,
  listingMatchesDynamicFilters,
  type FilterState,
} from "@/lib/categoryFilters";
import type { Listing } from "@/data/store";
import { ClassifiedSearchTable } from "@/components/ClassifiedSearchTable";
import { isSeaEquipCategoryId } from "@/data/seaEquip";

export function ListingBrowse({
  category,
  listings,
  heading,
  extra,
  emptyText,
}: {
  category?: Category | null;
  listings: Listing[];
  heading?: ReactNode;
  extra?: ReactNode;
  emptyText: string;
}) {
  const { t } = useI18n();
  const { user, reviewsFor } = useApp();
  const { requireAuth } = useAuthModal();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sort, setSort] = useState("yeni");
  const [filters, setFilters] = useState<FilterState>(emptyFilterState);
  const [wordDraft, setWordDraft] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const fields = useMemo(() => filterFieldsForCategory(category), [category]);
  const serviceTree = isServiceTreeCategory(category);
  const hub = serviceHubOf(category);

  useEffect(() => {
    const leaf =
      category && hub && category.parentId && category.parentId !== hub.id ? category.id : "";
    const marka = searchParams.get("marka") ?? "";
    const model = searchParams.get("model") ?? "";
    const seri = searchParams.get("seri") ?? "";
    setFilters((prev) => ({
      ...prev,
      city: prev.city ?? "",
      district: prev.district ?? "",
      neighborhood: prev.neighborhood ?? "",
      priceMin: prev.priceMin ?? "",
      priceMax: prev.priceMax ?? "",
      hours24: prev.hours24 ?? "",
      renoSub: leaf,
      brand: marka,
      model,
      trim: seri,
    }));
  }, [category?.id, hub?.id, searchParams]);

  const items = useMemo(() => {
    let list = listings.filter((l) => listingMatchesDynamicFilters(l, filters, fields));
    if (sort === "ucuz") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "pahali") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "puan") {
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
  }, [listings, filters, fields, sort, reviewsFor]);

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

  function writeFacetQuery(nextState: FilterState) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextState.brand) params.set("marka", nextState.brand);
    else params.delete("marka");
    if (nextState.model) params.set("model", nextState.model);
    else params.delete("model");
    if (nextState.trim) params.set("seri", nextState.trim);
    else params.delete("seri");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function setFilter(key: string, value: string) {
    const estate = category && rootOf(category).id === "emlak";
    const fromSchema = fields.some((f) => f.key === key || f.pairKey === key);
    if (!user && !BASIC.has(key) && !fromSchema && !estate) {
      requireAuth("filter");
      return;
    }
    setFilters((prev) => {
      const next = applyFilterChange(prev, key, value);
      if (key === "brand" || key === "model" || key === "trim") writeFacetQuery(next);
      return next;
    });
  }

  const sidebarCats = useMemo(() => (category ? [] : categories), [category]);

  const catCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of sidebarCats) {
      map[c.id] = listings.filter((l) => listingMatchesCategory(l, c)).length;
    }
    return map;
  }, [listings, sidebarCats]);

  const filterPanel = (variant: "aside" | "sheet") => (
    <FilterPanel
      variant={variant}
      fields={fields}
      state={filters}
      resultCount={items.length}
      onChange={setFilter}
      onClear={() => {
        setFilters(emptyFilterState());
        setWordDraft("");
        writeFacetQuery(emptyFilterState());
      }}
      onClose={variant === "sheet" ? () => setSheetOpen(false) : undefined}
      subcats={sidebarCats}
      activeCatId={category?.id}
      renoRoot={serviceTree ? hub ?? null : null}
      currentCat={category}
      catCounts={catCounts}
      listings={listings}
      wordDraft={wordDraft}
      onWordDraft={setWordDraft}
      onSearch={() => setFilter("keyword", wordDraft.trim())}
    />
  );

  return (
    <div>
      {serviceTree && category ? (
        <div className="browse-pagehead">
          <h1 className="text-lg font-extrabold tracking-tight text-ink">
            {t("cat.svc.hits", { name: catName(t, category.id, category.name), n: formatListingCount(items.length) })}
          </h1>
        </div>
      ) : (
        heading
      )}
      {extra}
      <div className="browse-layout">
        {filterPanel("aside")}

        <div className="browse-main">
          <div className={`browse-toolbar ${serviceTree ? "is-svc" : ""}`}>
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
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="acil-sort">
              <option value="yeni">{serviceTree ? t("cat.sort.adv") : t("cat.sort.new")}</option>
              {serviceTree ? <option value="puan">{t("cat.sort.rating")}</option> : null}
              {serviceTree ? null : <option value="ucuz">{t("cat.sort.asc")}</option>}
              {serviceTree ? null : <option value="pahali">{t("cat.sort.desc")}</option>}
            </select>
            <button
              type="button"
              className="browse-filter-btn"
              onClick={() => {
                if (!requireAuth("filter")) return;
                setSheetOpen(true);
              }}
            >
              <Filter className="h-4 w-4" />
              {t("cat.filter")}
              {active > 0 ? <span className="browse-filter-badge">{active}</span> : null}
            </button>
          </div>

          {items.length === 0 ? (
            <p className="acil-empty">{emptyText}</p>
          ) : serviceTree ? (
            <div className="svc-list">
              {items.map((l) => (
                <ServiceListingRow key={l.id} listing={l} reviews={reviewsFor(l.sellerId)} />
              ))}
            </div>
          ) : isSeaEquipCategoryId(category?.id ?? "") ? (
            <ClassifiedSearchTable listings={items} showProduct={category?.id !== "parts-sea"} />
          ) : (
            <ListingGrid>
              {items.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </ListingGrid>
          )}
        </div>
      </div>

      {sheetOpen ? (
        <div className="filter-sheet" role="dialog" aria-modal="true">
          <button
            type="button"
            className="filter-sheet-backdrop"
            aria-label={t("common.close")}
            onClick={() => setSheetOpen(false)}
          />
          {filterPanel("sheet")}
        </div>
      ) : null}
    </div>
  );
}
