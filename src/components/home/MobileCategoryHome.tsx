"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import {
  categories,
  categoryShortcuts,
  formatListingCount,
  hrefForCategory,
  parentOf,
  visibleChildren,
  walkCategories,
  type Category,
} from "@/data/categories";
import { CategoryIcon, iconTone } from "@/components/CategoryIcon";
import { catName, useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { liveCount } from "@/lib/categoryCounts";

function labelOf(t: (key: string, vars?: Record<string, string | number>) => string, cat: Category) {
  return catName(t, cat.id, cat.name).trim() || cat.name;
}

/** Phone version of /kategoriler: special-filter chips, an in-page search over the whole tree and one row per root. */
export function MobileCategoryHome() {
  const { t } = useI18n();
  const { categoryCounts } = useApp();
  const roots = useMemo(() => categories.filter((c) => !c.filter && !c.navHidden), []);
  const [q, setQ] = useState("");

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

  const rows = query ? hits : roots;

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

      {rows.length ? (
        <ul className="mc-list" aria-label={t("nav.catHome")}>
          {rows.map((cat) => {
            const n = liveCount(categoryCounts, cat);
            const up = query ? parentOf(cat) : undefined;
            const kids = query ? 0 : visibleChildren(cat).length;
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
                      {kids ? ` · ${t("cat.subn", { n: kids })}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="mc-row-chev" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
