"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Tag } from "lucide-react";
import {
  hrefForCategory,
  parentOf,
  searchBrands,
  searchCategories,
} from "@/data/categories";
import { CategoryIcon } from "./CategoryIcon";
import { catName, useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { liveCount } from "@/lib/categoryCounts";

type ListingHit = { id: string; title: string; categoryId: string; city: string };
type SuggestItem = { href: string; kind: "all" | "cat" | "brand" | "listing" | "attr"; title: string; sub?: string; icon?: string };

export function SearchSuggest({
  query,
  onPick,
  extraParams,
  active,
}: {
  query: string;
  onPick: () => void;
  extraParams?: Record<string, string>;
  active?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { categoryCounts, listings: catalog } = useApp();
  const q = query.trim();
  const cats = q.length >= 2 ? searchCategories(q).slice(0, 6) : [];
  const brands = q.length >= 2 ? searchBrands(q) : [];
  const [listings, setListings] = useState<ListingHit[]>([]);
  const [hi, setHi] = useState(0);

  const attrs = useMemo(() => {
    if (q.length < 3) return [];
    const needle = q.toLocaleLowerCase("tr");
    const seen = new Set<string>();
    const hits: { label: string; value: string }[] = [];
    for (const listing of catalog.slice(0, 500)) {
      for (const spec of listing.specs ?? []) {
        if (!spec.value || spec.value.length > 48) continue;
        if (!spec.value.toLocaleLowerCase("tr").includes(needle)) continue;
        const key = `${spec.label}:${spec.value}`.toLocaleLowerCase("tr");
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({ label: spec.label, value: spec.value });
        if (hits.length >= 4) return hits;
      }
    }
    return hits;
  }, [q, catalog]);

  useEffect(() => {
    if (q.length < 2) {
      setListings([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.ok || !Array.isArray(data.listings)) return;
          setListings(
            data.listings
              .filter((row: ListingHit) => row && typeof row.id === "string" && typeof row.title === "string")
              .slice(0, 8),
          );
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setListings([]);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  const allHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("q", q);
    for (const [k, v] of Object.entries(extraParams ?? {})) {
      if (v) params.set(k, v);
    }
    return `/ara?${params.toString()}`;
  }, [q, extraParams]);

  const items = useMemo<SuggestItem[]>(() => {
    if (q.length < 2) return [];
    const out: SuggestItem[] = [{ href: allHref, kind: "all", title: t("search.suggest.all", { q }) }];
    for (const c of cats) {
      const parent = parentOf(c);
      out.push({
        href: hrefForCategory(c),
        kind: "cat",
        title: catName(t, c.id, c.name),
        sub: `${parent ? `${catName(t, parent.id, parent.name)} · ` : ""}${t("cat.count", { n: liveCount(categoryCounts, c) })}`,
        icon: c.icon,
      });
    }
    for (const brand of brands) {
      const params = new URLSearchParams();
      params.set("q", brand);
      for (const [k, v] of Object.entries(extraParams ?? {})) {
        if (v) params.set(k, v);
      }
      out.push({ href: `/ara?${params.toString()}`, kind: "brand", title: brand });
    }
    for (const a of attrs) {
      out.push({
        href: `/ara?q=${encodeURIComponent(a.value)}`,
        kind: "attr",
        title: a.value,
        sub: a.label,
      });
    }
    for (const hit of listings) {
      out.push({
        href: `/ilan/${hit.id}`,
        kind: "listing",
        title: hit.title,
        sub: hit.city,
      });
    }
    return out;
  }, [q, allHref, cats, brands, attrs, listings, t, categoryCounts, extraParams]);

  useEffect(() => {
    setHi(0);
  }, [q]);

  useEffect(() => {
    if (!active || items.length === 0) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHi((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHi((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        if (hi > 0) {
          const pick = items[hi];
          if (pick) {
            e.preventDefault();
            onPick();
            router.push(pick.href);
          }
        }
      } else if (e.key === "Escape") {
        onPick();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items, hi, onPick, router]);

  if (q.length < 2) return null;

  return (
    <div className="search-suggest" role="listbox">
      {items.map((item, i) => (
        <Link
          key={`${item.kind}-${item.href}-${item.title}`}
          href={item.href}
          className={`search-suggest-item ${i === hi ? "is-on" : ""}`}
          onClick={onPick}
          onMouseEnter={() => setHi(i)}
        >
          <span className="icon-tile grid h-8 w-8 place-items-center rounded-lg text-lime">
            {item.kind === "cat" ? (
              <CategoryIcon name={item.icon ?? "grid"} className="h-4 w-4" />
            ) : item.kind === "brand" || item.kind === "attr" ? (
              <Tag className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{item.title}</span>
            {item.sub ? <span className="text-[11px] text-muted">{item.sub}</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
