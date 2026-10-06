"use client";

import { categories } from "@/data/categories";
import { useApp } from "@/context/AppContext";
import { catName, useI18n } from "@/context/I18nContext";

const STATS = [
  { value: "81", label: "stat.81", hint: "stat.81h" },
  { value: String(categories.length), label: "stat.cat", hint: "stat.cath" },
  { value: "E-posta", label: "stat.sup", hint: "stat.suph" },
  { value: "KVKK", label: "stat.kvkk", hint: "stat.kvkkh" },
] as const;

export default function NumbersPage() {
  const { listings, categoryCounts } = useApp();
  const { t } = useI18n();
  const cities = new Set(listings.filter((l) => l.status === "active").map((l) => l.city)).size;
  const verified = listings.filter((l) => l.status === "active" && l.sellerVerified).length;
  const live = [
    { value: String(listings.filter((l) => l.status === "active").length), label: t("live.ads") },
    { value: String(cities), label: t("live.cities") },
    { value: String(verified), label: t("live.ver") },
  ];

  return (
    <article>
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t("corp.nav.sayilarla")}</p>
      <h2 className="mt-1 text-2xl font-extrabold">{t("corp.num.h")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-soft">{t("corp.num.p")}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-panel p-4">
            <p className="grad-text text-2xl font-extrabold">{s.value}</p>
            <p className="mt-1 text-sm font-bold">{t(s.label)}</p>
            <p className="mt-1 text-xs text-muted">{t(s.hint)}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-8 text-lg font-extrabold">{t("corp.live")}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        {live.map((s) => (
          <div key={s.label} className="rounded-2xl border border-lime/25 bg-lime/5 p-4">
            <p className="text-2xl font-extrabold text-lime">{s.value}</p>
            <p className="mt-1 text-sm font-bold">{s.label}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-8 text-lg font-extrabold">{t("corp.tree")}</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-line bg-panel px-3 py-2 text-sm"
          >
            <span>{catName(t, c.id, c.name)}</span>
            <span className="text-xs text-muted">
              {t("cat.count", { n: categoryCounts[c.id] ?? 0 })}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
