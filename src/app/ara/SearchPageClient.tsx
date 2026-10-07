"use client";

import { useMemo, useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { catName, useI18n } from "@/context/I18nContext";
import {
  categoryShortcuts,
  findCategory,
  hrefForCategory,
  hrefForJobCategory,
  hrefForRenoCategory,
  inferCategoryFromQuery,
  isBeautyJobsCategory,
  isServiceTreeCategory,
  isServiceTreeLanding,
  listingMatchesCategory,
  searchCategories,
} from "@/data/categories";
import { listingMatchesFilter, listingMatchesTextQuery, parseListingFilter } from "@/lib/listingQuery";
import { isPublicListing } from "@/lib/categoryCounts";
import { ListingBrowse } from "@/components/ListingBrowse";
import { useAuthModal } from "@/context/AuthModalContext";
import Link from "next/link";
import { apiGet } from "@/lib/security/client";
import { listingCategoryChain } from "@/lib/listingFacts";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { filterQueryKey } from "@/lib/filterUrl";
import type { Listing } from "@/data/store";

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = (params.get("q") ?? "").trim();
  const city = (params.get("city") ?? "").trim() || undefined;
  const catSlug = (params.get("kategori") ?? params.get("cat") ?? "").trim();
  const resolvedCat = catSlug ? findCategory(catSlug) : undefined;
  const filter = parseListingFilter(params.get("filter")) ?? resolvedCat?.filter;
  const {
    listings,
    saveSearch,
    removeSavedSearch,
    savedSearches,
    isSearchSaved,
  } = useApp();
  const { t } = useI18n();
  const { requireAuth } = useAuthModal();
  const [hint, setHint] = useState("");
  const [remote, setRemote] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRemote(null);
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (city) qs.set("city", city);
    if (resolvedCat && !resolvedCat.filter) qs.set("kategori", resolvedCat.id);
    else if (catSlug && !resolvedCat) qs.set("kategori", catSlug);
    let cancelled = false;
    void apiGet<{ ok?: boolean; listings?: Listing[] }>(`/api/listings?${qs.toString()}`)
      .then((res) => {
        if (!cancelled) {
          const list = Array.isArray(res.listings) ? res.listings : null;
          setRemote(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, city, catSlug, resolvedCat]);

  const filterKey = filterQueryKey(params);
  const [serverResult, setServerResult] = useState<{ key: string; listings: Listing[] } | null>(null);

  useEffect(() => {
    if (!filterKey || !resolvedCat || resolvedCat.filter) {
      setServerResult(null);
      return;
    }
    const qs = new URLSearchParams(filterKey);
    if (q) qs.set("q", q);
    qs.set("kategori", resolvedCat.id);
    let cancelled = false;
    const timer = setTimeout(() => {
      void apiGet<{ ok?: boolean; listings?: Listing[] }>(`/api/listings?${qs.toString()}`)
        .then((res) => {
          if (!cancelled && Array.isArray(res.listings)) {
            setServerResult({ key: filterKey, listings: res.listings.filter(isPublicListing) });
          }
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filterKey, q, resolvedCat]);

  useEffect(() => {
    if (filter !== "urgent" && filter !== "h48") return;
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (city) next.set("city", city);
    if (catSlug) next.set("kategori", catSlug);
    const qs = next.toString();
    const dest = filter === "urgent" ? "/acil" : "/son-48-saat";
    router.replace(qs ? `${dest}?${qs}` : dest);
  }, [filter, q, city, catSlug, router]);
  const saved = isSearchSaved(q, city);
  const savedRow = savedSearches.find(
    (s) =>
      s.query.trim().toLocaleLowerCase("tr") === q.toLocaleLowerCase("tr") &&
      (s.city || "") === (city || ""),
  );
  const filterCat = categoryShortcuts.find((c) => c.filter === filter);
  const inferred = !catSlug && !filter ? inferCategoryFromQuery(q) : undefined;
  const pickedCat = resolvedCat ?? filterCat ?? inferred;
  const catHits = q ? searchCategories(q).slice(0, 8) : [];

  useEffect(() => {
    if (pickedCat && isBeautyJobsCategory(pickedCat)) {
      router.replace(hrefForJobCategory(pickedCat));
    } else if (pickedCat && isServiceTreeCategory(pickedCat) && !isServiceTreeLanding(pickedCat)) {
      router.replace(hrefForRenoCategory(pickedCat));
    }
  }, [pickedCat, router]);

  const baseList = useMemo(() => {
    const source = remote ?? listings;
    const needle = q.toLocaleLowerCase("tr");
    return source.filter((l) => {
      if (!isPublicListing(l)) return false;
      if (!listingMatchesFilter(l, filter)) return false;
      if (pickedCat && !pickedCat.filter && !listingMatchesCategory(l, pickedCat)) return false;
      if (city && l.city !== city) return false;
      if (!needle) return true;
      return listingMatchesTextQuery(l, q);
    });
  }, [listings, remote, q, city, filter, pickedCat]);

  function onSave() {
    if (!requireAuth("member")) return;
    if (!q && !city) {
      setHint(t("search.hint.type"));
      return;
    }
    if (saved && savedRow) {
      removeSavedSearch(savedRow.id);
      setHint(t("search.hint.out"));
      return;
    }
    saveSearch({ query: q, city });
    setHint(t("search.hint.in"));
  }

  const heading = pickedCat ? catName(t, pickedCat.id, pickedCat.name) : t("common.search");
  const crumbItems = pickedCat
    ? [
        { href: "/", label: t("nav.home") },
        ...listingCategoryChain(pickedCat.id).map((c, i, arr) => ({
          href: i === arr.length - 1 ? undefined : hrefForCategory(c),
          label: catName(t, c.id, c.name),
        })),
      ]
    : [
        { href: "/", label: t("nav.home") },
        { label: q ? `"${q}"` : t("common.search") },
      ];

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 lg:px-5">
      <BreadcrumbNav items={crumbItems} className="hub-crumb mb-3" />
      <ListingBrowse
        category={pickedCat}
        listings={baseList}
        serverResult={serverResult && serverResult.key === filterKey ? serverResult.listings : null}
        loading={loading}
        emptyText={t("search.noneFilters")}
        heading={
          <div className="browse-pagehead justify-between">
                <h1 className="text-lg font-extrabold tracking-tight text-ink">
                  {city && pickedCat ? t("search.headingCity", { city, name: heading }) : heading}
                </h1>
            <button
              type="button"
              onClick={onSave}
              className={`btn-ghost h-10 px-4 text-sm ${saved ? "!border-lime/40 !bg-lime/10 !text-lime" : ""}`}
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {saved ? t("common.saved") : t("common.saveSearch")}
            </button>
            {hint ? <p className="w-full text-xs font-medium text-ink">{hint}</p> : null}
          </div>
        }
        extra={
          catHits.length > 0 ? (
            <div className="browse-extra-cats mb-3 flex gap-2 overflow-auto no-scrollbar">
              {catHits.map((c) => (
                <Link key={c.id} href={hrefForCategory(c)} className="shortcut-chip">
                  {catName(t, c.id, c.name)}
                </Link>
              ))}
            </div>
          ) : null
        }
      />
    </div>
  );
}

function SearchFallback() {
  const { t } = useI18n();
  return <div className="p-8 text-ink">{t("common.loading")}</div>;
}

export function SearchPageClient() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchInner />
    </Suspense>
  );
}
