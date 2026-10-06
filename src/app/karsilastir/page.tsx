"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useCompare } from "@/context/CompareContext";
import { useI18n } from "@/context/I18nContext";
import { isPublicListing } from "@/lib/categoryCounts";
import type { Listing } from "@/data/store";
import { listingSellerLabel } from "@/lib/publicName";

export default function ComparePage() {
  const { listings } = useApp();
  const { ids, remove, clear } = useCompare();
  const { t, formatMoney } = useI18n();
  const items = useMemo(
    () =>
      ids
        .map((id) => listings.find((l) => l.id === id && isPublicListing(l)))
        .filter((l): l is Listing => Boolean(l)),
    [ids, listings],
  );

  const specKeys = useMemo(() => {
    const set = new Set<string>();
    for (const l of items) for (const s of l.specs) set.add(s.label);
    return [...set];
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-extrabold">{t("cmp.bar")}</h1>
        <p className="mt-2 text-sm text-muted">{t("cmp.empty")}</p>
        <Link href="/" className="btn-primary mt-6 inline-flex h-11 px-5">
          {t("go.home")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">{t("cmp.bar")}</h1>
        <button type="button" className="chip" onClick={clear}>
          {t("cmp.clear")}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="cmp-table">
          <thead>
            <tr>
              <th>{t("cmp.field")}</th>
              {items.map((l) => (
                <th key={l.id}>
                  <Link href={`/ilan/${l.id}`} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.images[0]} alt="" className="mb-2 h-24 w-full rounded-lg object-cover" />
                    <span className="font-semibold">{l.title}</span>
                  </Link>
                  <button type="button" className="mt-1 text-xs text-orange" onClick={() => remove(l.id)}>
                    {t("cmp.remove")}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>{t("cmp.price")}</th>
              {items.map((l) => (
                <td key={l.id} className="price-text font-extrabold">
                  {formatMoney(l.price)}
                </td>
              ))}
            </tr>
            <tr>
              <th>{t("cmp.place")}</th>
              {items.map((l) => (
                <td key={l.id}>
                  {l.city} / {l.district}
                </td>
              ))}
            </tr>
            <tr>
              <th>{t("cmp.seller")}</th>
              {items.map((l) => (
                <td key={l.id}>{listingSellerLabel(l)}</td>
              ))}
            </tr>
            {specKeys.map((key) => (
              <tr key={key}>
                <th>{key}</th>
                {items.map((l) => (
                  <td key={l.id}>{l.specs.find((s) => s.label === key)?.value ?? "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
