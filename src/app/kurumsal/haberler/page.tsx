"use client";

import Link from "next/link";
import { NEWS } from "@/data/corporate";
import { useI18n } from "@/context/I18nContext";

const NEWS_I18N: Record<string, { t: string; s: string; tag: string }> = {
  "81-il-ilan-sihirbazi": { t: "news.2.t", s: "news.2.s", tag: "news.tag.pl" },
  "kvkk-cerez-aydinlatma": { t: "news.3.t", s: "news.3.s", tag: "news.tag.c" },
};

export default function NewsPage() {
  const { t } = useI18n();
  return (
    <article>
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t("corp.nav.haberler")}</p>
      <h2 className="mt-1 text-2xl font-extrabold">{t("corp.news.h")}</h2>
      <p className="mt-3 text-sm text-soft">{t("corp.news.p")}</p>
      <ul className="mt-6 space-y-3">
        {NEWS.map((n) => {
          const keys = NEWS_I18N[n.slug];
          return (
            <li key={n.slug}>
              <Link
                href={`/kurumsal/haberler/${n.slug}`}
                className="block rounded-2xl border border-line bg-panel p-4 transition hover:border-lime/35"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full bg-lime/15 px-2 py-0.5 font-bold text-lime">
                    {keys ? t(keys.tag) : n.tag}
                  </span>
                </div>
                <p className="mt-2 text-base font-extrabold">{keys ? t(keys.t) : n.title}</p>
                <p className="mt-1 text-sm text-muted">{keys ? t(keys.s) : n.summary}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
