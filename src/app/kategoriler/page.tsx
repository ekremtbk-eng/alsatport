"use client";

import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import {
  categories,
  categoryShortcuts,
  hrefForCategory,
  searchCategories,
} from "@/data/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { SpecialFilterCards } from "@/components/special/SpecialFilterCards";
import { LiveCount } from "@/components/LiveCount";
import { catName, useI18n } from "@/context/I18nContext";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { useApp } from "@/context/AppContext";
import { liveCount } from "@/lib/categoryCounts";
import { useMemo, useState } from "react";

export default function CategoriesPage() {
  const { t } = useI18n();
  const { categoryCounts } = useApp();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    if (!q.trim()) return categories;
    return searchCategories(q);
  }, [q]);

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 lg:max-w-6xl">
      <BreadcrumbNav items={[{ href: "/", label: t("nav.home") }, { label: t("nav.categories") }]} />
      <h1 className="mb-3 text-xl font-bold">{t("nav.categories")}</h1>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("cat.search")}
          className="h-11 w-full rounded-xl border border-line bg-panel ps-10 pe-4 text-sm"
        />
      </div>

      {!q.trim() ? (
        <>
          <h2 className="mb-2 text-sm font-bold text-lime">{t("cat.filters")}</h2>
          <div className="mb-5">
            <SpecialFilterCards compact />
          </div>
          <div className="mb-5 flex flex-wrap gap-2">
            {categoryShortcuts
              .filter((c) => c.filter !== "urgent" && c.filter !== "h48")
              .map((c) => (
              <Link key={c.id} href={hrefForCategory(c)} className="shortcut-chip">
                <CategoryIcon name={c.icon} className="h-3.5 w-3.5" />
                {catName(t, c.id, c.name)}
                <LiveCount cat={c} className="text-[11px] tabular-nums text-muted" />
                {c.badge === "new" ? <span className="cat-badge-new">{t("cat.new")}</span> : null}
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((c) => {
          const n = liveCount(categoryCounts, c);
          return (
            <Link key={c.id} href={hrefForCategory(c)} className="home-cat-card !p-3">
              <span className="icon-tile grid h-12 w-12 place-items-center rounded-2xl text-lime">
                <CategoryIcon name={c.icon} className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-semibold">
                  {catName(t, c.id, c.name)}
                  {c.badge === "new" ? <span className="cat-badge-new">{t("cat.new")}</span> : null}
                  {c.circular ? <span className="cat-badge-circ" title={t("cat.circular")} /> : null}
                </p>
                <p className="text-xs text-muted">{t("cat.count", { n })}</p>
                {c.children?.length ? (
                  <p className="mt-0.5 text-[11px] text-muted">{t("cat.subn", { n: c.children.length })}</p>
                ) : null}
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
