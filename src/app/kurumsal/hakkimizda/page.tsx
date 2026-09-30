"use client";

import Link from "next/link";
import { ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

export default function AboutPage() {
  const { t } = useI18n();
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t("corp.about.kicker")}</p>
      <h2 className="!mt-1 text-2xl font-extrabold">{t("corp.about.h")}</h2>
      <p>{t("corp.about.p1")}</p>
      <p>{t("corp.about.p2")}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Sparkles, title: t("corp.about.modern"), text: t("corp.about.modern.t") },
          { icon: ShieldCheck, title: t("corp.about.safe"), text: t("corp.about.safe.t") },
          { icon: Zap, title: t("corp.about.innov"), text: t("corp.about.innov.t") },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl border border-line bg-panel p-4">
            <c.icon className="h-5 w-5 text-lime" />
            <p className="mt-2 font-extrabold">{c.title}</p>
            <p className="mt-1 text-xs text-muted">{c.text}</p>
          </div>
        ))}
      </div>

      <h3>{t("corp.about.what")}</h3>
      <ul>
        <li>{t("corp.about.li1")}</li>
        <li>{t("corp.about.li2")}</li>
        <li>{t("corp.about.li3")}</li>
        <li>{t("corp.about.li4")}</li>
      </ul>
      <p>
        <Link href="/kurumsal/dunden-bugune" className="font-semibold text-lime">
          {t("corp.nav.dunden-bugune")}
        </Link>
        {" · "}
        <Link href="/kurumsal/sayilarla" className="font-semibold text-lime">
          {t("corp.nav.sayilarla")}
        </Link>
      </p>
    </article>
  );
}
