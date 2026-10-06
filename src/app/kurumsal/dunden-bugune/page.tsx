"use client";

import { useI18n } from "@/context/I18nContext";

export default function HistoryPage() {
  const { t } = useI18n();
  return (
    <article className="legal-prose">
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t("corp.nav.dunden-bugune")}</p>
      <h2 className="!mt-1 text-2xl font-extrabold">{t("corp.story.h")}</h2>
      <p>{t("corp.story.p")}</p>
      <ul>
        <li>{t("corp.about.li1")}</li>
        <li>{t("corp.about.li2")}</li>
        <li>{t("corp.about.li3")}</li>
        <li>{t("corp.about.li4")}</li>
        <li>{t("corp.about.innov.t")}</li>
      </ul>
    </article>
  );
}
