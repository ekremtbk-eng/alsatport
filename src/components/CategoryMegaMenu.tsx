"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { catName, useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import {
  categories,
  categoryPath,
  hrefForCategory,
  parentOf,
  visibleChildren,
  walkCategories,
  type Category,
} from "@/data/categories";
import { liveCount } from "@/lib/categoryCounts";

function labelOf(
  t: (key: string, vars?: Record<string, string | number>) => string,
  cat: Category,
) {
  const name = catName(t, cat.id, cat.name).trim();
  return name || cat.name;
}

function haystack(
  t: (key: string, vars?: Record<string, string | number>) => string,
  cat: Category,
) {
  return [labelOf(t, cat), cat.name, cat.slug, ...(cat.aliases ?? [])]
    .join(" ")
    .toLocaleLowerCase("tr");
}

export function CategoryMegaMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { categoryCounts } = useApp();
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const roots = useMemo(() => categories.filter((c) => !c.filter && !c.navHidden), []);
  const [cursor, setCursor] = useState<Category | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setCursor(null);
      setQuery("");
      return;
    }
    const id = window.setTimeout(() => searchRef.current?.focus(), 40);
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const q = query.trim().toLocaleLowerCase("tr");
  const hits = useMemo(() => {
    if (q.length < 1) return [];
    const out: Category[] = [];
    const seen = new Set<string>();
    walkCategories(roots, (c) => {
      if (c.filter || c.navHidden || seen.has(c.id)) return;
      if (!haystack(t, c).includes(q)) return;
      seen.add(c.id);
      out.push(c);
    });
    return out.slice(0, 40);
  }, [q, roots, t]);

  const rows = cursor ? visibleChildren(cursor) : roots;
  const showing = q ? hits : rows;
  const backLabel = cursor
    ? parentOf(cursor)
      ? t("common.back")
      : t("nav.categories")
    : "";
  const title = cursor ? labelOf(t, cursor) : t("nav.categories");

  function go(cat: Category) {
    onClose();
    router.push(hrefForCategory(cat));
  }

  function choose(cat: Category) {
    if (visibleChildren(cat).length) {
      setCursor(cat);
      setQuery("");
      return;
    }
    go(cat);
  }

  function back() {
    if (!cursor) {
      onClose();
      return;
    }
    setCursor(parentOf(cursor) ?? null);
  }

  if (!open) return null;

  return (
    <div ref={box} className="cat-mega" role="dialog" aria-label={t("nav.categories")}>
      <div className="cat-mega-search">
        <Search className="cat-mega-search-ico" aria-hidden />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("nav.cat.search")}
          aria-label={t("nav.cat.search")}
          autoComplete="off"
        />
      </div>

      {!q ? (
        <>
          <div className="cat-mega-head">
            {cursor ? (
              <button type="button" className="cat-mega-back" onClick={back}>
                <ChevronLeft className="h-5 w-5" aria-hidden />
                {backLabel}
              </button>
            ) : (
              <span className="cat-mega-title">{title}</span>
            )}
            {cursor ? <strong className="cat-mega-current">{title}</strong> : null}
          </div>
          {cursor ? (
            <button type="button" className="cat-mega-all" onClick={() => go(cursor)}>
              {t("flt.cat.all", { name: labelOf(t, cursor) })}
            </button>
          ) : null}
        </>
      ) : null}

      {q && !hits.length ? <p className="cat-mega-empty">{t("nav.cat.empty")}</p> : null}

      <ul className="cat-mega-list">
        {showing.map((c) => {
          const kids = visibleChildren(c);
          const n = liveCount(categoryCounts, c);
          const path = q ? categoryPath(c).slice(0, -1) : [];
          const pathLabel = path.map((p) => labelOf(t, p)).filter(Boolean).join(" › ");
          return (
            <li key={c.id}>
              <button type="button" className="cat-mega-row" onClick={() => choose(c)}>
                <span className="cat-mega-row-main">
                  <span className="cat-mega-row-name">{labelOf(t, c)}</span>
                  {pathLabel ? <span className="cat-mega-row-path">{pathLabel}</span> : null}
                </span>
                {n > 0 ? <span className="cat-mega-n">{n.toLocaleString("tr-TR")}</span> : null}
                {kids.length ? <ChevronRight className="cat-mega-chev" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
