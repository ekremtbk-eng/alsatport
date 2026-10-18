"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
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

export function childSummary(
  t: (key: string, vars?: Record<string, string | number>) => string,
  cat: Category,
  max = 4,
) {
  const kids = visibleChildren(cat);
  const names = kids.slice(0, max).map((c) => catName(t, c.id, c.name)).filter(Boolean);
  if (!names.length) return "";
  return kids.length > max ? `${names.join(", ")}...` : names.join(", ");
}

function CategoryCard({
  root,
  open,
  onToggle,
}: {
  root: Category;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const panelId = useId();
  const kids = visibleChildren(root);
  const summary = childSummary(t, root);
  const hasKids = kids.length > 0;

  return (
    <section className={`cat-card ${open ? "is-open" : ""}`}>
      {hasKids ? (
        <button
          type="button"
          className="cat-card-head"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className={`cat-ico ${iconTone(root.icon)}`} aria-hidden>
            <CategoryIcon name={root.icon} className="h-4 w-4" />
          </span>
          <span className="cat-card-title">
            <span className="cat-card-name">{catName(t, root.id, root.name)}</span>
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
            <span className="cat-card-name">{catName(t, root.id, root.name)}</span>
            <LiveCount cat={root} className="cat-card-count" />
          </span>
        </Link>
      )}

      {!open && summary ? <p className="cat-card-summary">{summary}</p> : null}

      {hasKids ? (
        <div
          id={panelId}
          className="cat-card-panel"
          hidden={!open}
          aria-hidden={!open}
        >
          <ul className="cat-card-subs">
            {kids.map((child) => (
              <li key={child.id}>
                <Link href={hrefForCategoryListings(child)} className="cat-card-sub">
                  <span>{catName(t, child.id, child.name)}</span>
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
}

export function HomeCategoryRail() {
  const { t } = useI18n();
  const roots = categories.filter((c) => !c.filter && !c.navHidden);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <nav className="cat-rail" aria-label={t("nav.categories")}>
      {roots.map((root) => (
        <CategoryCard
          key={root.id}
          root={root}
          open={openId === root.id}
          onToggle={() => setOpenId((cur) => (cur === root.id ? null : root.id))}
        />
      ))}
    </nav>
  );
}
