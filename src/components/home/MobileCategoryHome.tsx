"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import {
  categories,
  categoryShortcuts,
  formatListingCount,
  hrefForCategory,
  hrefForCategoryListings,
  parentOf,
  visibleChildren,
  walkCategories,
  type Category,
} from "@/data/categories";
import { CategoryIcon, iconTone } from "@/components/CategoryIcon";
import { LiveCount } from "@/components/LiveCount";
import { catName, useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { liveCount } from "@/lib/categoryCounts";
import { childSummary } from "@/components/home/HomeCategoryRail";

function labelOf(t: (key: string, vars?: Record<string, string | number>) => string, cat: Category) {
  return catName(t, cat.id, cat.name).trim() || cat.name;
}

/** Phone version of /kategoriler: special-filter chips, an in-page search over the whole tree and one card per root. */
export function MobileCategoryHome() {
  const { t } = useI18n();
  const { categoryCounts } = useApp();
  const roots = useMemo(() => categories.filter((c) => !c.filter && !c.navHidden), []);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const query = q.trim().toLocaleLowerCase("tr");
  const hits = useMemo(() => {
    if (query.length < 1) return [];
    const out: Category[] = [];
    const seen = new Set<string>();
    walkCategories(roots, (c) => {
      if (c.filter || c.navHidden || seen.has(c.id)) return;
      const hay = [labelOf(t, c), c.name, c.slug, ...(c.aliases ?? [])].join(" ").toLocaleLowerCase("tr");
      if (!hay.includes(query)) return;
      seen.add(c.id);
      out.push(c);
    });
    return out.slice(0, 40);
  }, [query, roots, t]);

  return (
    <div className="mc">
      <h1 className="mc-title">{t("nav.catHome")}</h1>
      <form className="mc-search" role="search" onSubmit={(e) => e.preventDefault()}>
        <Search className="mc-search-ico" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("cat.find")}
          aria-label={t("cat.find")}
          enterKeyHint="search"
          autoComplete="off"
        />
        {q ? (
          <button type="button" className="mc-search-x" aria-label={t("common.close")} onClick={() => setQ("")}>
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </form>

      {query ? null : (
        <ul className="mc-chips" aria-label={t("cat.filters")}>
          {categoryShortcuts.map((c) => (
            <li key={c.id}>
              <Link href={hrefForCategory(c)} className={`mc-chip ${c.filter === "urgent" ? "is-urgent" : c.filter === "h48" ? "is-fresh" : ""}`}>
                <CategoryIcon name={c.icon} className="h-4 w-4" />
                {labelOf(t, c)}
                <span className="mc-chip-n">{formatListingCount(liveCount(categoryCounts, c))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {query && !hits.length ? <p className="mc-empty">{t("nav.cat.empty")}</p> : null}

      {query ? (
        hits.length ? (
          <ul className="mc-list" aria-label={t("nav.catHome")}>
            {hits.map((cat) => {
              const n = liveCount(categoryCounts, cat);
              const up = parentOf(cat);
              return (
                <li key={cat.id}>
                  <Link href={hrefForCategory(cat)} className="mc-row">
                    <span className={`mc-row-ico cat-ico ${iconTone(cat.icon)}`} aria-hidden>
                      <CategoryIcon name={cat.icon} className="h-5 w-5" />
                    </span>
                    <span className="mc-row-copy">
                      <span className="mc-row-name">{labelOf(t, cat)}</span>
                      <span className="mc-row-sub">
                        {up ? `${labelOf(t, up)} · ` : ""}
                        {t("cat.count", { n: formatListingCount(n) })}
                      </span>
                    </span>
                    <ChevronRight className="mc-row-chev" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null
      ) : (
        <div className="mc-cards" aria-label={t("nav.catHome")}>
          {roots.map((root) => {
            const kids = visibleChildren(root);
            const open = openId === root.id;
            const summary = childSummary(t, root);
            const panelId = `mc-card-${root.id}`;
            return (
              <section key={root.id} className={`cat-card mc-cat-card ${open ? "is-open" : ""}`}>
                {kids.length ? (
                  <button
                    type="button"
                    className="cat-card-head"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenId((cur) => (cur === root.id ? null : root.id))}
                  >
                    <span className={`cat-ico ${iconTone(root.icon)}`} aria-hidden>
                      <CategoryIcon name={root.icon} className="h-4 w-4" />
                    </span>
                    <span className="cat-card-title">
                      <span className="cat-card-name">{labelOf(t, root)}</span>
                      <LiveCount cat={root} className="cat-card-count" />
                    </span>
                    <ChevronDown className={`cat-card-chev ${open ? "is-open" : ""}`} aria-hidden />
                  </button>
                ) : (
                  <Link href={hrefForCategory(root)} className="cat-card-head">
                    <span className={`cat-ico ${iconTone(root.icon)}`} aria-hidden>
                      <CategoryIcon name={root.icon} className="h-4 w-4" />
                    </span>
                    <span className="cat-card-title">
                      <span className="cat-card-name">{labelOf(t, root)}</span>
                      <LiveCount cat={root} className="cat-card-count" />
                    </span>
                    <ChevronRight className="cat-card-chev" aria-hidden />
                  </Link>
                )}
                {!open && summary ? <p className="cat-card-summary">{summary}</p> : null}
                {kids.length ? (
                  <div id={panelId} className="cat-card-panel" hidden={!open} aria-hidden={!open}>
                    <ul className="cat-card-subs">
                      {kids.map((child) => (
                        <li key={child.id}>
                          <Link href={hrefForCategoryListings(child)} className="cat-card-sub">
                            <span>{labelOf(t, child)}</span>
                            <LiveCount cat={child} className="cat-card-sub-count" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link href={hrefForCategory(root)} className="cat-card-all">
                      {t("cat.seeAll")}
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
