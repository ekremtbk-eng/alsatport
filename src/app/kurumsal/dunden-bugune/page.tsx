"use client";

import { TIMELINE } from "@/data/corporate";
import { useI18n } from "@/context/I18nContext";

export default function HistoryPage() {
  const { t } = useI18n();
  return (
    <article>
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t("corp.nav.dunden-bugune")}</p>
      <h2 className="mt-1 text-2xl font-extrabold">{t("corp.story.h")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-soft">{t("corp.story.p")}</p>
      <ol className="relative mt-8 space-y-6 border-s border-lime/30 ps-6">
        {TIMELINE.map((item) => (
          <li key={item.year} className="relative">
            <span className="absolute -start-[29px] top-1 grid h-4 w-4 place-items-center rounded-full bg-lime shadow-[0_0_12px_rgba(45,255,140,0.6)]" />
            <p className="text-xs font-bold text-lime">{item.year}</p>
            <h3 className="mt-0.5 text-lg font-extrabold">{t(`tl.${item.year}.h`)}</h3>
            <p className="mt-1 text-sm leading-relaxed text-soft">{t(`tl.${item.year}.p`)}</p>
          </li>
        ))}
      </ol>
    </article>
  );
}
