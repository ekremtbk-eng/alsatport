"use client";

import Link from "next/link";
import {
  hrefForCategory,
  searchCategories,
} from "@/data/categories";
import { CategoryIcon } from "./CategoryIcon";
import { catName, useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { liveCount } from "@/lib/categoryCounts";

export function SearchSuggest({
  query,
  onPick,
}: {
  query: string;
  onPick: () => void;
}) {
  const { t } = useI18n();
  const { categoryCounts } = useApp();
  const hits = searchCategories(query).slice(0, 8);
  if (!query.trim() || hits.length === 0) return null;
  return (
    <div className="search-suggest">
      <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {t("nav.categories")}
      </p>
      <ul>
        {hits.map((c) => (
          <li key={c.id}>
            <Link href={hrefForCategory(c)} className="search-suggest-item" onClick={onPick}>
              <span className="icon-tile grid h-8 w-8 place-items-center rounded-lg text-lime">
                <CategoryIcon name={c.icon} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{catName(t, c.id, c.name)}</span>
                <span className="text-[11px] text-muted">
                  {t("cat.count", { n: liveCount(categoryCounts, c) })}
                </span>
              </span>
              {c.badge === "new" ? <span className="cat-badge-new">{t("cat.new")}</span> : null}
              {c.circular ? <span className="cat-badge-circ" title={t("cat.circular")} /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
