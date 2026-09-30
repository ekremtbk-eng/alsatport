"use client";

import Link from "next/link";
import { Columns2 } from "lucide-react";
import { useCompare, COMPARE_MAX } from "@/context/CompareContext";
import { useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import type { Listing } from "@/data/store";
import { useState } from "react";

export function CompareToolbar({ listing }: { listing: Listing }) {
  const { ids, toggle, has, remove } = useCompare();
  const { listings } = useApp();
  const { requireAuth } = useAuthModal();
  const { t } = useI18n();
  const [hint, setHint] = useState("");
  const on = has(listing.id);
  const selected = listings.filter((l) => ids.includes(l.id));

  return (
    <div className="compare-bar">
      <button
        type="button"
        className={`compare-add ${on ? "is-on" : ""}`}
        onClick={() => {
          if (!requireAuth("member")) return;
          const res = toggle(listing.id);
          if (res === "full") setHint(t("cmp.full", { n: COMPARE_MAX }));
          else setHint("");
        }}
      >
        <Columns2 className="h-4 w-4" />
        {on ? t("cmp.remove") : t("cmp.add")}
      </button>
      <Link
        href="/karsilastir"
        className={`compare-go ${ids.length < 2 ? "is-off" : ""}`}
        onClick={(e) => {
          if (!requireAuth("member")) e.preventDefault();
        }}
      >
        {t("cmp.bar")}
        {ids.length ? <span className="compare-count">{ids.length}</span> : null}
      </Link>
      {selected.length > 0 ? (
        <ul className="compare-chips">
          {selected.map((l) => (
            <li key={l.id}>
              <Link href={`/ilan/${l.id}`}>{l.title}</Link>
              <button type="button" aria-label={t("common.delete")} onClick={() => remove(l.id)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {hint ? <p className="compare-hint">{hint}</p> : null}
    </div>
  );
}
