"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  categories,
  hrefForCategoryListings,
  parentOf,
  visibleChildren,
  walkCategories,
  type Category,
} from "@/data/categories";
import { CategoryIcon, iconTone } from "@/components/CategoryIcon";
import { catName, useI18n } from "@/context/I18nContext";
import { childSummary } from "@/components/home/HomeCategoryRail";
import { useApp } from "@/context/AppContext";
import { NotificationPanel } from "@/components/NotificationPanel";
import { Logo } from "@/components/Logo";

function labelOf(t: (key: string, vars?: Record<string, string | number>) => string, cat: Category) {
  return catName(t, cat.id, cat.name).trim() || cat.name;
}

export function MobileCategoryHome() {
  const { t } = useI18n();
  const router = useRouter();
  const { unreadNotifications } = useApp();
  const roots = useMemo(() => categories.filter((c) => !c.filter && !c.navHidden), []);
  const [cursor, setCursor] = useState<Category | null>(null);
  const [q, setQ] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

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

  const rows = query ? hits : cursor ? visibleChildren(cursor) : roots;
  const backLabel = cursor ? (parentOf(cursor) ? t("common.back") : t("nav.catHome")) : "";

  function go(cat: Category) {
    router.push(hrefForCategoryListings(cat));
  }

  function choose(cat: Category) {
    if (query) {
      go(cat);
      return;
    }
    if (visibleChildren(cat).length) {
      setCursor(cat);
      setQ("");
      return;
    }
    go(cat);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    router.push(`/ara?q=${encodeURIComponent(text)}`);
  }

  return (
    <div className="m-cat-home">
      <header className="m-cat-top">
        <Logo compact />
        <h1>{t("nav.catHome")}</h1>
        <div className="relative">
          <button
            type="button"
            className="m-cat-bell"
            aria-label={t("nav.notifications")}
            data-notif-toggle
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 ? <span className="m-cat-bell-dot" /> : null}
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>
      </header>

      <form className="m-cat-search" onSubmit={onSearch}>
        <Search className="m-cat-search-ico" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("nav.catHome.search")}
          enterKeyHint="search"
          autoComplete="off"
        />
      </form>

      {cursor && !query ? (
        <div className="m-cat-level">
          <button type="button" className="m-cat-back" onClick={() => setCursor(parentOf(cursor) ?? null)}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
            {backLabel}
          </button>
          <strong>{labelOf(t, cursor)}</strong>
          <button type="button" className="m-cat-all" onClick={() => go(cursor)}>
            {t("flt.cat.all", { name: labelOf(t, cursor) })}
          </button>
        </div>
      ) : null}

      {query && !hits.length ? <p className="m-cat-empty">{t("nav.cat.empty")}</p> : null}

      <ul className="m-cat-list">
        {rows.map((cat) => {
          const kids = visibleChildren(cat);
          const summary = query ? "" : childSummary(t, cat);
          return (
            <li key={cat.id}>
              <button type="button" className="m-cat-row" onClick={() => choose(cat)}>
                <span className={`cat-ico ${iconTone(cat.icon)}`}>
                  <CategoryIcon name={cat.icon} className="h-5 w-5" />
                </span>
                <span className="m-cat-copy">
                  <span className="m-cat-name">{labelOf(t, cat)}</span>
                  {summary ? <span className="m-cat-sub">{summary}</span> : null}
                </span>
                {kids.length ? <ChevronRight className="m-cat-chev" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
