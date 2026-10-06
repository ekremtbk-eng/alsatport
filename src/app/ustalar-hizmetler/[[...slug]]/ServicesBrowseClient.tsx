"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ListingBrowse } from "@/components/ListingBrowse";
import { useApp } from "@/context/AppContext";
import { catName, useI18n } from "@/context/I18nContext";
import {
  findCategoryFromRenoPath,
  isServiceTreeLanding,
  listingMatchesCategory,
  renoBranchOf,
} from "@/data/categories";
import { isPublicListing } from "@/lib/categoryCounts";
import { ServicesHome } from "@/components/ServicesHome";
import { CategoryHub } from "@/components/CategoryHub";
import { apiGet } from "@/lib/security/client";
import type { Listing } from "@/data/store";
import Link from "next/link";

export function ServicesBrowseClient() {
  const params = useParams<{ slug?: string[] }>();
  const segments = Array.isArray(params.slug) ? params.slug.map((s) => decodeURIComponent(s)) : [];
  const cat = findCategoryFromRenoPath(segments);
  const { listings } = useApp();
  const { t } = useI18n();
  const [remote, setRemote] = useState<Listing[] | null>(null);

  useEffect(() => {
    if (!cat || cat.id === "services" || isServiceTreeLanding(cat)) return;
    const scope = renoBranchOf(cat) ?? cat;
    const qs = new URLSearchParams({ kategori: scope.id });
    let cancelled = false;
    void apiGet<{ listings?: Listing[] }>(`/api/listings?${qs.toString()}`).then((res) => {
      if (!cancelled) setRemote(res.listings ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [cat?.id]);

  const baseList = useMemo(() => {
    if (!cat || cat.id === "services" || isServiceTreeLanding(cat)) return [];
    const source = remote ?? listings;
    const scope = renoBranchOf(cat) ?? cat;
    return source.filter((l) => isPublicListing(l) && listingMatchesCategory(l, scope));
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

  if (cat.id === "services") {
    return <ServicesHome />;
  }

  if (isServiceTreeLanding(cat)) {
    return <CategoryHub cat={cat} />;
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
