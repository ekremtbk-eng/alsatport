"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ListingBrowse } from "@/components/ListingBrowse";
import { useApp } from "@/context/AppContext";
import { catName, useI18n } from "@/context/I18nContext";
import { findCategoryFromJobPath, listingMatchesCategory } from "@/data/categories";
import { isPublicListing } from "@/lib/categoryCounts";
import { apiGet } from "@/lib/security/client";
import type { Listing } from "@/data/store";
import Link from "next/link";

export function JobsBrowseClient() {
  const params = useParams<{ slug?: string[] }>();
  const segments = Array.isArray(params.slug) ? params.slug.map((s) => decodeURIComponent(s)) : [];
  const cat = findCategoryFromJobPath(segments);
  const { listings } = useApp();
  const { t } = useI18n();
  const [remote, setRemote] = useState<Listing[] | null>(null);

  useEffect(() => {
    if (!cat) return;
    const qs = new URLSearchParams({ kategori: cat.id });
    let cancelled = false;
    void apiGet<{ listings?: Listing[] }>(`/api/listings?${qs.toString()}`).then((res) => {
      if (!cancelled) setRemote(res.listings ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [cat?.id, cat?.slug]);

  const baseList = useMemo(() => {
    const source = remote ?? listings;
    return source.filter((l) => {
      if (!isPublicListing(l)) return false;
      if (cat && !listingMatchesCategory(l, cat)) return false;
      return true;
    });
  }, [listings, remote, cat]);

  if (!cat) {
    return (
      <div className="p-8 text-center text-ink">
        {t("cat.empty")}{" "}
        <Link href="/kategoriler" className="font-semibold text-lime">
          {t("nav.categories")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 lg:px-5">
      <ListingBrowse
        category={cat}
        listings={baseList}
        emptyText={t("search.none")}
        heading={
          <div className="browse-pagehead">
            <h1 className="text-lg font-extrabold tracking-tight text-ink">{catName(t, cat.id, cat.name)}</h1>
          </div>
        }
      />
    </div>
  );
}
