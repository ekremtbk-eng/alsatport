"use client";

import { Leaf, Recycle, Users } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export default function SustainabilityPage() {
  const { t } = useI18n();
  const cards = [
    { icon: Recycle, title: t("corp.sus.h"), text: t("corp.sus.p") },
    { icon: Leaf, title: t("stat.sup"), text: t("stat.suph") },
    { icon: Users, title: t("corp.hr.h"), text: t("corp.hr.p") },
  ];
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t("corp.nav.surdurulebilirlik")}</p>
      <h2 className="!mt-1 text-2xl font-extrabold">{t("corp.sus.h")}</h2>
      <p>{t("corp.sus.p")}</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl border border-line bg-panel p-4">
            <c.icon className="h-5 w-5 text-lime" />
            <p className="mt-2 font-extrabold">{c.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{c.text}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
