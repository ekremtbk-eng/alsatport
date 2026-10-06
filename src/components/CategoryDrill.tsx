"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { catName, useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import {
  catalogCount,
  categoryPath,
  formatListingCount,
  parentOf,
  visibleChildren,
  type Category,
} from "@/data/categories";
import { liveCount } from "@/lib/categoryCounts";

function labelOf(
  t: (key: string, vars?: Record<string, string | number>) => string,
  cat: Category,
) {
  const name = catName(t, cat.id, cat.name).trim();
  if (!name || /^\(\d+[.,\d]*\)$/.test(name)) return (cat.name || "").trim();
  return name;
}

export function CategoryDrill({
  roots,
  selected,
  onPick,
  onBackOut,
}: {
  roots: Category[];
  selected?: Category | null;
  stay?: boolean;
  onPick?: (cat: Category) => void;
  onBackOut?: () => void;
}) {
  const { t } = useI18n();
  const { categoryCounts } = useApp();
  const uniqueRoots = useMemo(() => {
    const seen = new Set<string>();
    return roots.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return Boolean(labelOf(t, c));
    });
  }, [roots, t]);

  const [cursor, setCursor] = useState<Category | null>(null);

  useEffect(() => {
    if (!selected) {
      setCursor(null);
      return;
    }
    const kids = visibleChildren(selected);
    setCursor(kids.length ? selected : parentOf(selected) ?? null);
  }, [selected?.id]);

  const levelCats = cursor ? visibleChildren(cursor) : uniqueRoots;
  const seen = new Set<string>();
  const rows = levelCats.filter((c) => {
    const name = labelOf(t, c);
    if (!name || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  const path = cursor ? categoryPath(cursor) : [];

  function countFor(cat: Category) {
    const live = liveCount(categoryCounts, cat);
    return live > 0 ? live : catalogCount(cat);
  }

  function choose(cat: Category) {
    const kids = visibleChildren(cat);
    if (kids.length) {
      setCursor(cat);
      return;
    }
    onPick?.(cat);
  }

  function back() {
    if (cursor) {
      const p = parentOf(cursor);
      const inRoots = uniqueRoots.some((r) => r.id === cursor.id);
      if (!p || inRoots) {
        setCursor(null);
        return;
      }
      setCursor(p);
      return;
    }
    onBackOut?.();
  }

  return (
    <div className="cat-drill">
      <div className="cat-drill-bar">
        <button type="button" className="cat-drill-back" onClick={back} aria-label={t("common.back")}>
          <ChevronLeft className="h-5 w-5" />
          {t("common.back")}
        </button>
        <strong>{t("flt.cat.pick")}</strong>
      </div>
      {path.length ? (
        <p className="cat-drill-crumb">
          {path.map((c) => labelOf(t, c)).filter(Boolean).join(" › ")}
        </p>
      ) : null}
      {cursor ? (
        <button type="button" className="cat-drill-all" onClick={() => onPick?.(cursor)}>
          {t("flt.cat.all", { name: labelOf(t, cursor) })}
          <span>{formatListingCount(countFor(cursor))}</span>
        </button>
      ) : null}
      <ul className="cat-drill-list">
        {rows.map((cat) => {
          const kids = visibleChildren(cat);
          const n = countFor(cat);
          const active = selected?.id === cat.id;
          return (
            <li key={cat.id}>
              <button
                type="button"
                className={`cat-drill-row ${active ? "is-on" : ""}`}
                onClick={() => choose(cat)}
              >
                <span className="cat-drill-name">{labelOf(t, cat)}</span>
                <span className="cat-drill-n">{formatListingCount(n)}</span>
                {kids.length ? <ChevronRight className="h-4 w-4 cat-drill-chev" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
