"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  hrefForCategory,
  hrefForCategoryListings,
  isCategoryOnPath,
  visibleChildren,
  type Category,
} from "@/data/categories";
import { CategoryIcon, iconTone } from "@/components/CategoryIcon";
import { LiveCount } from "@/components/LiveCount";
import { catName, useI18n } from "@/context/I18nContext";
import { currentCategoryFromLocation } from "@/components/CategoryHub";

function useActiveCategory() {
  const path = usePathname();
  const params = useSearchParams();
  return currentCategoryFromLocation(path, params.get("kategori") ?? params.get("cat"));
}

function Meta({ cat }: { cat: Category }) {
  const { t } = useI18n();
  return (
    <span className="ms-auto flex shrink-0 items-center gap-1">
      {cat.badge === "new" ? <span className="cat-badge-new">{t("cat.new")}</span> : null}
      {cat.circular ? <span className="cat-badge-circ" title={t("cat.circular")} /> : null}
      <LiveCount cat={cat} />
    </span>
  );
}

export function CategoryTreeLink({
  cat,
  depth = 0,
}: {
  cat: Category;
  depth?: number;
}) {
  const params = useSearchParams();
  const path = usePathname();
  const { t } = useI18n();
  const current = useActiveCategory();
  const href = hrefForCategory(cat);
  const active = cat.filter === "urgent"
    ? path === "/acil"
    : cat.filter === "h48"
      ? path === "/son-48-saat"
      : cat.filter
        ? params.get("filter") === cat.filter
        : isCategoryOnPath(cat, current) && cat.id === current?.id;
  return (
    <Link
      href={href}
      className={`cat-link ${depth > 0 ? `cat-link-d${Math.min(depth, 3)}` : ""} ${active ? "cat-link-on" : ""}`}
    >
      <span className={`cat-ico ${iconTone(cat.icon)}`}>
        <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
      </span>
      <span className="cat-link-name min-w-0 flex-1 leading-tight">{catName(t, cat.id, cat.name)}</span>
      <Meta cat={cat} />
    </Link>
  );
}

export function CategoryTreeNode({ cat, depth = 0 }: { cat: Category; depth?: number }) {
  const { t } = useI18n();
  const current = useActiveCategory();
  const kids = visibleChildren(cat);
  const onPath = isCategoryOnPath(cat, current);
  const [open, setOpen] = useState(onPath);

  useEffect(() => {
    if (onPath) setOpen(true);
  }, [onPath]);

  if (!kids.length) {
    return (
      <li>
        <CategoryTreeLink cat={cat} depth={depth} />
      </li>
    );
  }

  return (
    <li className="cat-tree-node">
      <div className="flex items-stretch">
        <div className="min-w-0 flex-1">
          <CategoryTreeLink cat={cat} depth={depth} />
        </div>
        <button
          type="button"
          className={`cat-chevron ${open ? "open" : ""}`}
          aria-expanded={open}
          aria-label={t("cat.subn", { n: kids.length })}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      {open ? (
        <ul className="cat-children">
          {kids.map((ch) => (
            <CategoryTreeNode key={ch.id} cat={ch} depth={depth + 1} />
          ))}
          {cat.seeAll ? (
            <li>
              <Link href={hrefForCategoryListings(cat)} className="cat-see-all">
                {t("cat.seeAll")}
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}

export function CategoryTree({ items }: { items: Category[] }) {
  return (
    <ul className="cat-tree">
      {items.map((c) => (
        <CategoryTreeNode key={c.id} cat={c} />
      ))}
    </ul>
  );
}
