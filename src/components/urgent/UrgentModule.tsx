"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlignJustify,
  Bookmark,
  BookmarkCheck,
  Camera,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { catName, useI18n } from "@/context/I18nContext";
import {
  categories,
  findCategory,
  formatListingCount,
  listingMatchesCategory,
  type Category,
} from "@/data/categories";
import type { Listing } from "@/data/store";
import { isPublicListing } from "@/lib/categoryCounts";
import { listingMatchesFilter, listingMatchesTextQuery, listingMatchesTitleQuery, listingPostedAt, postedFilterHours } from "@/lib/listingQuery";
import { StdFilterSidebar, STD_DATE_PRESETS, STD_FRESH_PRESETS } from "@/components/StdFilterSidebar";

export type SpecialMode = "urgent" | "h48";
type ViewMode = "split" | "grid" | "list";

function UrgentThumb({ listing }: { listing: Listing }) {
  const [broken, setBroken] = useState(false);
  const src = listing.images[0];
  if (!src || broken) {
    return (
      <div className="acil-thumb-ph">
        <Camera className="h-8 w-8" strokeWidth={1.4} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="acil-thumb-img" onError={() => setBroken(true)} />
  );
}

function ageText(listing: Listing, t: (key: string, vars?: Record<string, string | number>) => string) {
  const ms = Date.now() - listingPostedAt(listing);
  const mins = Math.max(1, Math.floor(ms / 60_000));
  if (mins < 60) return t("fresh.mins", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("fresh.hours", { n: hours });
  return t("fresh.days", { n: Math.floor(hours / 24) });
}

function SpecialRow({ listing, mode }: { listing: Listing; mode: SpecialMode }) {
  const { formatMoney, t } = useI18n();
  const unspecified = listing.price <= 0;
  return (
    <Link href={`/ilan/${listing.id}`} className={`acil-row is-${mode}`}>
      <span className="acil-ribbon">{mode === "urgent" ? t("acil.badge") : t("fresh.badge")}</span>
      <div className="acil-thumb">
        <UrgentThumb listing={listing} />
      </div>
      <div className="acil-row-body">
        <p className="acil-no">
          #{listing.listingNo}
          <span className="acil-age">{ageText(listing, t)}</span>
        </p>
        <h3 className="acil-title">{listing.title}</h3>
        <p className={`acil-price ${unspecified ? "is-na" : ""}`}>
          {unspecified ? t("acil.unspecified") : formatMoney(listing.price)}
        </p>
        <p className="acil-meta">
          {t("acil.posted")} : {listing.createdAt}
        </p>
        <p className="acil-meta">
          {t("acil.place")} : {listing.city}
          {listing.district ? ` / ${listing.district}` : ""}
        </p>
      </div>
    </Link>
  );
}

export function UrgentModule() {
  return <SpecialListingsModule mode="urgent" />;
}

export function SpecialListingsModule({ mode }: { mode: SpecialMode }) {
  const params = useSearchParams();
  const { listings, saveSearch, removeSavedSearch, savedSearches, isSearchSaved } = useApp();
  const { requireAuth } = useAuthModal();
  const { t } = useI18n();
  const initialCity = (params.get("city") ?? "").trim();
  const initialQ = (params.get("q") ?? "").trim();
  const initialCat = (params.get("kategori") ?? params.get("cat") ?? "").trim();

  const [city, setCity] = useState(initialCity);
  const [district, setDistrict] = useState("");
  const [posted, setPosted] = useState("");
  const [mappedOnly, setMappedOnly] = useState(false);
  const [word, setWord] = useState(initialQ);
  const [includeDesc, setIncludeDesc] = useState(false);
  const [catId, setCatId] = useState(initialCat);
  const [sort, setSort] = useState("yeni");
  const [view, setView] = useState<ViewMode>("split");
  const [more, setMore] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [hint, setHint] = useState("");
  const [draft, setDraft] = useState(initialQ);

  const pickedCat = catId ? findCategory(catId) : undefined;
  const saved = isSearchSaved(word, city || undefined, mode);
  const savedRow = savedSearches.find(
    (s) =>
      s.filter === mode &&
      s.query.trim().toLocaleLowerCase("tr") === word.trim().toLocaleLowerCase("tr") &&
      (s.city || "") === (city || ""),
  );

  const pool = useMemo(
    () => listings.filter((l) => isPublicListing(l) && listingMatchesFilter(l, mode)),
    [listings, mode],
  );

  const catCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const root of categories) {
      map[root.id] = pool.filter((l) => listingMatchesCategory(l, root)).length;
    }
    return map;
  }, [pool]);

  const datePresets = mode === "h48" ? STD_FRESH_PRESETS : STD_DATE_PRESETS;

  const items = useMemo(() => {
    let list = pool.filter((l) => {
      if (pickedCat && !listingMatchesCategory(l, pickedCat)) return false;
      if (city && l.city !== city) return false;
      if (district && l.district !== district) return false;
      if (mappedOnly && !(l.city && l.district)) return false;
      if (posted) {
        const hours = postedFilterHours(posted);
        if (hours && Date.now() - listingPostedAt(l) > hours * 3_600_000) return false;
      }
      const min = priceMin ? Number(priceMin.replace(/\D/g, "")) : 0;
      const max = priceMax ? Number(priceMax.replace(/\D/g, "")) : 0;
      if (min && l.price < min) return false;
      if (max && l.price > max) return false;
      if (word.trim()) {
        return includeDesc ? listingMatchesTextQuery(l, word) : listingMatchesTitleQuery(l, word);
      }
      return true;
    });
    if (sort === "ucuz") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "pahali") list = [...list].sort((a, b) => b.price - a.price);
    else list = [...list].sort((a, b) => listingPostedAt(b) - listingPostedAt(a));
    return list;
  }, [pool, pickedCat, city, district, mappedOnly, posted, word, includeDesc, sort, priceMin, priceMax]);

  function onSave() {
    if (!requireAuth("member")) return;
    if (saved && savedRow) {
      removeSavedSearch(savedRow.id);
      setHint(t("search.hint.out"));
      return;
    }
    saveSearch({ query: word, city: city || undefined, filter: mode });
    setHint(t("search.hint.in"));
  }

  function pickCat(cat?: Category) {
    setCatId(cat?.slug ?? cat?.id ?? "");
  }

  return (
    <div className={`acil-page is-${mode}`}>
      <nav className="acil-bc" aria-label={t("acil.bc")}>
        <Link href="/">{t("nav.home")}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>{mode === "urgent" ? t("acil.title") : t("fresh.title")}</span>
      </nav>

      <div className="acil-banner">
        <div>
          <p className="acil-kicker">{t("cat.filters")}</p>
          <h1>{mode === "urgent" ? t("acil.title") : t("fresh.title")}</h1>
          <p className="acil-sub">{mode === "urgent" ? t("acil.sub") : t("fresh.sub")}</p>
        </div>
      </div>

      <div className="acil-layout">
        <aside className="acil-side">
          <StdFilterSidebar
            cats={
              <ul className="acil-cats">
                {categories.map((c) => {
                  const n = catCounts[c.id] ?? 0;
                  const on = pickedCat?.id === c.id;
                  return (
                    <li key={c.id}>
                      <button type="button" className={on ? "is-on" : ""} onClick={() => pickCat(on ? undefined : c)}>
                        {catName(t, c.id, c.name)}
                        <span>({formatListingCount(n)})</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            }
            extra={
              <label className="acil-field">
                <span>{t("flt.price")}</span>
                <div className="acil-price-row">
                  <input
                    className="acil-input"
                    inputMode="numeric"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value.replace(/\D/g, ""))}
                    placeholder={t("flt.min")}
                  />
                  <input
                    className="acil-input"
                    inputMode="numeric"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value.replace(/\D/g, ""))}
                    placeholder={t("flt.max")}
                  />
                </div>
              </label>
            }
            city={city}
            district={district}
            posted={posted}
            mappedOnly={mappedOnly}
            draft={draft}
            includeDesc={includeDesc}
            more={more}
            datePresets={datePresets}
            radioName={`spec-date-${mode}`}
            onCity={setCity}
            onDistrict={setDistrict}
            onPosted={setPosted}
            onMappedOnly={setMappedOnly}
            onDraft={setDraft}
            onIncludeDesc={setIncludeDesc}
            onMore={() => setMore((v) => !v)}
            onSearch={() => setWord(draft.trim())}
          />
        </aside>

        <div className="acil-main">
          <div className="acil-toolbar">
            <p className="acil-found">
              {t("acil.found", { n: formatListingCount(items.length) })}
            </p>
            <button type="button" className={`acil-save ${saved ? "is-on" : ""}`} onClick={onSave}>
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {saved ? t("common.saved") : t("common.saveSearch")}
            </button>
          </div>
          {hint ? <p className="acil-hint">{hint}</p> : null}

          <div className="acil-views">
            <button type="button" className={!catId ? "is-on" : ""} onClick={() => pickCat(undefined)}>
              {t("cat.all")}
            </button>
            <div className="acil-view-icons">
              <button
                type="button"
                className={view === "grid" ? "is-on" : ""}
                aria-label={t("acil.view.grid")}
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={view === "list" ? "is-on" : ""}
                aria-label={t("acil.view.list")}
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={view === "split" ? "is-on" : ""}
                aria-label={t("acil.view.split")}
                onClick={() => setView("split")}
              >
                <AlignJustify className="h-4 w-4" />
              </button>
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="acil-sort">
              <option value="yeni">{t("acil.sort.date")}</option>
              <option value="ucuz">{t("cat.sort.asc")}</option>
              <option value="pahali">{t("cat.sort.desc")}</option>
            </select>
          </div>

          {items.length === 0 ? (
            <p className="acil-empty">{mode === "urgent" ? t("acil.empty") : t("fresh.empty")}</p>
          ) : (
            <div className={`acil-results is-${view}`}>
              {items.map((l) => (
                <SpecialRow key={l.id} listing={l} mode={mode} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
