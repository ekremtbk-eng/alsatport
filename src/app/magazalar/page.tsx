"use client";

import { Store } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

const shops = [
  { name: "TeknoPort", city: "İstanbul", ads: 128 },
  { name: "OtoVizyon", city: "Ankara", ads: 64 },
  { name: "Emlak81", city: "İzmir", ads: 91 },
  { name: "MacCorner", city: "Bursa", ads: 22 },
];

export default function StoresPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl px-3 py-4">
      <h1 className="mb-4 text-xl font-bold">{t("store.h")}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {shops.map((s) => (
          <article key={s.name} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4">
            <span className="icon-tile grid h-12 w-12 place-items-center rounded-2xl text-lime">
              <Store />
            </span>
            <div>
              <p className="font-bold">{s.name}</p>
              <p className="text-sm text-muted">
                {s.city} · {t("cat.count", { n: s.ads })}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
