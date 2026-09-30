"use client";

import Link from "next/link";
import {
  catalogCount,
  formatListingCount,
  hrefForCategory,
  parentOf,
  renoBranchOf,
  serviceHubOf,
  visibleChildren,
  type Category,
} from "@/data/categories";
import { catName, useI18n } from "@/context/I18nContext";
import { liveCount } from "@/lib/categoryCounts";
import { useApp } from "@/context/AppContext";

export function FilterRenoTree({
  current,
  root,
  selectedIds,
  onToggleLeaf,
}: {
  current: Category;
  root: Category;
  selectedIds: string[];
  onToggleLeaf: (id: string) => void;
}) {
  const { t } = useI18n();
  const { categoryCounts } = useApp();
  const branches = visibleChildren(root);
  const activeBranch = renoBranchOf(current) ?? current;
  const selected = new Set(selectedIds);

  function countOf(cat: Category) {
    const live = liveCount(categoryCounts, cat);
    return live > 0 ? live : catalogCount(cat);
  }

  return (
    <div className="flt-reno-tree">
      <p className="flt-reno-root">
        <Link href={hrefForCategory(root)}>{catName(t, root.id, root.name)}</Link>
      </p>
      <ul className="flt-reno-branches">
        {branches.map((branch) => {
          const on = activeBranch.id === branch.id;
          const kids = visibleChildren(branch);
          return (
            <li key={branch.id}>
              <Link href={hrefForCategory(branch)} className={`flt-reno-radio ${on ? "is-on" : ""}`}>
                <span className="flt-reno-mark" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{catName(t, branch.id, branch.name)}</span>
                <span className="flt-reno-n">({formatListingCount(countOf(branch))})</span>
              </Link>
              {on && kids.length ? (
                <ul className="flt-reno-leaves">
                  {kids.map((leaf) => {
                    const checked = selected.has(leaf.id) || current.id === leaf.id;
                    return (
                      <li key={leaf.id}>
                        <label className={`flt-reno-check ${checked ? "is-on" : ""}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleLeaf(leaf.id)}
                          />
                          <span className="min-w-0 flex-1">{catName(t, leaf.id, leaf.name)}</span>
                          <span className="flt-reno-n">({formatListingCount(countOf(leaf))})</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function toggleRenoLeaf(current: string[], id: string) {
  const set = new Set(current.filter(Boolean));
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return [...set].join(",");
}

export function renoSelectedFromCategory(cat: Category) {
  const hub = serviceHubOf(cat);
  const p = parentOf(cat);
  if (hub && p && p.parentId === hub.id) return cat.id;
  return "";
}
