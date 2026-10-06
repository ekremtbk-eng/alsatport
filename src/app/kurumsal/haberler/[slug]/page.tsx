"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { findNews } from "@/data/corporate";
import { useI18n } from "@/context/I18nContext";

const NEWS_I18N: Record<string, { t: string; s: string; tag: string }> = {
  "81-il-ilan-sihirbazi": { t: "news.2.t", s: "news.2.s", tag: "news.tag.pl" },
  "kvkk-cerez-aydinlatma": { t: "news.3.t", s: "news.3.s", tag: "news.tag.c" },
};

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const n = findNews(slug);
  if (!n) notFound();
  const keys = NEWS_I18N[n.slug];

  return (
    <article className="legal-prose">
      <Link href="/kurumsal/haberler" className="text-xs font-bold text-lime">
        {t("corp.news.all")}
      </Link>
      <p className="mt-3 text-[11px] text-muted">
        {keys ? t(keys.tag) : n.tag}
      </p>
      <h2 className="!mt-1 text-2xl font-extrabold">{keys ? t(keys.t) : n.title}</h2>
      <p>{keys ? t(keys.s) : n.summary}</p>
    </article>
  );
}
