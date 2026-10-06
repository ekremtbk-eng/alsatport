"use client";

import Link from "next/link";
import {
  categories,
  hrefForCategory,
  hrefForCategoryListings,
  visibleChildren,
  type Category,
} from "@/data/categories";
import { CategoryIcon, iconTone } from "@/components/CategoryIcon";
import { LiveCount } from "@/components/LiveCount";
import { catName, useI18n } from "@/context/I18nContext";

export function HomeCategoryRail() {
  const { t } = useI18n();
  const roots = categories.filter((c) => !c.filter && !c.navHidden);

  return (
    <nav className="cat-rail" aria-label={t("nav.categories")}>
      {roots.map((root) => {
        const kids = visibleChildren(root);
        return (
          <section key={root.id} className="cat-rail-block">
            <Link href={hrefForCategory(root)} className="cat-rail-head">
              <span className={`cat-ico ${iconTone(root.icon)}`}>
                <CategoryIcon name={root.icon} className="h-3.5 w-3.5" />
              </span>
              <span className="cat-rail-head-name">{catName(t, root.id, root.name)}</span>
              <LiveCount cat={root} />
            </Link>
            {kids.length ? (
              <ul className="cat-rail-subs">
                {kids.map((child) => (
                  <li key={child.id}>
                    <Link href={hrefForCategoryListings(child)} className="cat-rail-sub">
                      <span>{catName(t, child.id, child.name)}</span>
                      <LiveCount cat={child} />
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={hrefForCategory(root)} className="cat-rail-all">
                    {t("cat.seeAll")}
                    <span aria-hidden>›</span>
                  </Link>
                </li>
              </ul>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
}

export function childSummary(t: (key: string, vars?: Record<string, string | number>) => string, cat: Category, max = 4) {
  const kids = visibleChildren(cat);
  const names = kids.slice(0, max).map((c) => catName(t, c.id, c.name)).filter(Boolean);
  if (!names.length) return "";
  return kids.length > max ? `${names.join(", ")}...` : names.join(", ");
}
