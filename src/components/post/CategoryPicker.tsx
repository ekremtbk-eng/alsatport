"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Search, X } from "lucide-react";
import { categories, findCategory, parentOf, walkCategories, type Category } from "@/data/categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { catName, useI18n } from "@/context/I18nContext";

export function categoryTrail(cat: Category | undefined) {
  const out: Category[] = [];
  const seen = new Set<string>();
  let node = cat;
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    out.unshift(node);
    node = parentOf(node);
  }
  return out;
}

export function isPostableLeaf(id: string) {
  const cat = findCategory(id);
  return !!cat && cat.id === id && !cat.children?.length;
}

const fold = (s: string) => s.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Category step: drill from the main categories down to a final one (only leaves can be picked), or search
 * every final category by name. Tapping a group never selects it, so no listing ends up in a broad group.
 */
export function CategoryPicker({
  value,
  chosen,
  startId,
  onPick,
}: {
  value: string;
  /** False until the user (or a draft / edited listing) actually picked `value`. */
  chosen: boolean;
  /** Group to open first, e.g. Vasıta for /ilan-ver?type=vasita. */
  startId?: string | null;
  onPick: (id: string) => void;
}) {
  const { t } = useI18n();
  const selected = chosen ? findCategory(value) : undefined;
  const selectedTrail = useMemo(() => categoryTrail(selected), [selected]);
  const [browseId, setBrowseId] = useState<string | null>(() => {
    if (selected) return selected.children?.length ? selected.id : (parentOf(selected)?.id ?? null);
    return startId ?? null;
  });
  const [q, setQ] = useState("");
  const name = (c: Category) => catName(t, c.id, c.name);

  const browse = browseId ? findCategory(browseId) : undefined;
  const trail = categoryTrail(browse);
  const nodes = browse?.children ?? categories;
  const onPath = new Set(selectedTrail.map((c) => c.id));

  const leaves = useMemo(() => {
    const out: { cat: Category; label: string; path: string; key: string }[] = [];
    walkCategories(categories, (c) => {
      if (c.children?.length) return;
      const path = categoryTrail(c).map((n) => catName(t, n.id, n.name));
      out.push({ cat: c, label: path[path.length - 1], path: path.slice(0, -1).join(" › "), key: fold(`${path.join(" ")} ${c.name}`) });
    });
    return out;
  }, [t]);
  const query = fold(q.trim());
  const hits = query.length >= 2 ? leaves.filter((l) => query.split(/\s+/).every((w) => l.key.includes(w))).slice(0, 40) : null;

  const pick = (c: Category) => {
    onPick(c.id);
    setQ("");
    const parent = parentOf(c);
    setBrowseId(parent?.id ?? null);
  };

  return (
    <div className="cat-pick">
      {selected ? (
        <div className="cat-pick-chosen" data-cat-chosen={selected.id}>
          <span className="cat-pick-chosen-ico">
            <Check className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="cat-pick-chosen-k">{t("post.catChosen")}</p>
            <p className="cat-pick-chosen-v">{selectedTrail.map(name).join(" › ")}</p>
          </div>
        </div>
      ) : null}

      <label className="cat-pick-search">
        <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <span className="sr-only">{t("post.catSearch")}</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("post.catSearch")}
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {q ? (
          <button type="button" onClick={() => setQ("")} aria-label={t("common.clear")}>
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </label>

      {hits ? (
        <ul className="cat-pick-list" aria-label={t("post.catSearch")}>
          {hits.length === 0 ? <li className="cat-pick-empty">{t("post.catNone")}</li> : null}
          {hits.map(({ cat, label, path }) => (
            <li key={cat.id}>
              <button
                type="button"
                className={`cat-pick-row ${selected?.id === cat.id ? "is-on" : ""}`}
                onClick={() => pick(cat)}
                data-cat-id={cat.id}
              >
                <span className="min-w-0 flex-1">
                  <span className="cat-pick-name">{label}</span>
                  {path ? <span className="cat-pick-path">{path}</span> : null}
                </span>
                {selected?.id === cat.id ? <Check className="h-5 w-5 shrink-0 text-lime" aria-hidden /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <nav className="cat-pick-trail" aria-label={t("post.catTrail")}>
            <button type="button" onClick={() => setBrowseId(null)} className={browse ? "" : "is-here"}>
              {t("post.catAll")}
            </button>
            {trail.map((c, i) => (
              <span key={c.id} className="contents">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted rtl:rotate-180" aria-hidden />
                <button type="button" onClick={() => setBrowseId(c.id)} className={i === trail.length - 1 ? "is-here" : ""}>
                  {name(c)}
                </button>
              </span>
            ))}
          </nav>
          <ul className="cat-pick-list">
            {nodes.map((c) => {
              const group = !!c.children?.length;
              const on = selected?.id === c.id || (group && onPath.has(c.id));
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`cat-pick-row ${on ? "is-on" : ""}`}
                    onClick={() => (group ? setBrowseId(c.id) : pick(c))}
                    aria-current={selected?.id === c.id ? "true" : undefined}
                    data-cat-id={c.id}
                    data-cat-group={group ? "1" : undefined}
                  >
                    <span className="cat-pick-ico">
                      <CategoryIcon name={c.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="cat-pick-name">{name(c)}</span>
                      {group ? <span className="cat-pick-path">{t("post.catSubN", { n: c.children!.length })}</span> : null}
                    </span>
                    {group ? (
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted rtl:rotate-180" aria-hidden />
                    ) : selected?.id === c.id ? (
                      <Check className="h-5 w-5 shrink-0 text-lime" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
