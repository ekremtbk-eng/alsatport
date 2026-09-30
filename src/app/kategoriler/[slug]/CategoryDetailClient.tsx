"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { findCategory, hrefForCategoryListings, hrefForJobCategory, hrefForRenoCategory, isBeautyJobsCategory, isServiceTreeCategory, isServiceTreeLanding, visibleChildren } from "@/data/categories";
import { CategoryHub } from "@/components/CategoryHub";
import Link from "next/link";
import { useI18n } from "@/context/I18nContext";

export function CategoryDetailClient() {
  const { slug } = useParams<{ slug: string }>();
  const decoded = decodeURIComponent(slug ?? "");
  const cat = findCategory(decoded);
  const router = useRouter();
  const { t } = useI18n();
  const isHub = Boolean(cat && visibleChildren(cat).length && !cat.browse);

  useEffect(() => {
    if (cat && isBeautyJobsCategory(cat)) {
      router.replace(hrefForJobCategory(cat));
      return;
    }
    if (cat && isServiceTreeCategory(cat) && !isServiceTreeLanding(cat)) {
      router.replace(hrefForRenoCategory(cat));
      return;
    }
    if (cat && !isHub) router.replace(hrefForCategoryListings(cat));
  }, [cat, isHub, router]);

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

  if (isBeautyJobsCategory(cat) || (isServiceTreeCategory(cat) && !isServiceTreeLanding(cat)) || !isHub) {
    return <p className="p-8 text-center text-sm text-ink">Yönlendiriliyor…</p>;
  }

  return <CategoryHub cat={cat} />;
}
