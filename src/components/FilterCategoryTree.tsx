"use client";

import { CategoryDrill } from "@/components/CategoryDrill";
import { findCategory, type Category } from "@/data/categories";

export function FilterCategoryTree({
  roots,
  selectedId,
  stay,
  onPick,
}: {
  roots: Category[];
  selectedId?: string;
  stay?: boolean;
  onPick?: (cat: Category) => void;
}) {
  const selected = selectedId ? findCategory(selectedId) : undefined;
  return (
    <CategoryDrill
      roots={roots}
      selected={selected}
      stay={stay}
      onPick={onPick ?? (() => undefined)}
    />
  );
}

export function filterTreeRoot(cat?: Category | null): Category | undefined {
  return cat ?? undefined;
}
