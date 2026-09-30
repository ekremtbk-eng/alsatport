"use client";

import { LayoutGrid, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { categories, categoryShortcuts } from "@/data/categories";
import { CategoryTree, CategoryTreeLink } from "@/components/home/CategoryTree";
import { SpecialFilterCards } from "@/components/special/SpecialFilterCards";
import { useI18n } from "@/context/I18nContext";

const TIME_IDS = new Set(["filter-urgent", "filter-48h"]);

export function Sidebar() {
  const { t } = useI18n();
  const editorial = useMemo(
    () => categoryShortcuts.filter((c) => !TIME_IDS.has(c.id)),
    [],
  );

  return (
    <aside className="desktop-sidebar sticky top-[108px] h-[calc(100vh-120px)] w-[300px] shrink-0 overflow-auto rounded-2xl border border-line bg-panel p-3 shadow-[0_8px_28px_-12px_rgba(15,23,42,0.18)]">
      <SpecialFilterCards />

      <p className="cat-section-label mt-4">
        <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />
        {t("nav.categories")}
      </p>
      <CategoryTree items={categories} />

      <p className="cat-section-label mt-4">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        {t("cat.picks")}
      </p>
      <ul className="cat-tree">
        {editorial.map((c) => (
          <li key={c.id}>
            <CategoryTreeLink cat={c} />
          </li>
        ))}
      </ul>
    </aside>
  );
}
