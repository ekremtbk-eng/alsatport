"use client";

import { formatListingCount, type Category } from "@/data/categories";
import { useApp } from "@/context/AppContext";
import { liveCount } from "@/lib/categoryCounts";

export function LiveCount({
  cat,
  className = "cat-count",
}: {
  cat: Category | string;
  className?: string;
}) {
  const { categoryCounts } = useApp();
  const n = liveCount(categoryCounts, cat);
  return <span className={className}>({formatListingCount(n)})</span>;
}

export function liveCountOf(
  counts: Record<string, number>,
  cat: Category | string,
) {
  return liveCount(counts, cat);
}
