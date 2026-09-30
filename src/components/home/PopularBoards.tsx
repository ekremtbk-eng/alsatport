"use client";

import Link from "next/link";
import { categories, hrefForCategory } from "@/data/categories";
import { catName, useI18n } from "@/context/I18nContext";

const SEARCHES = [
  "iPhone 15",
  "BMW 3.20",
  "Kiralık Daire",
  "MacBook",
  "Honda Motosiklet",
  "PlayStation 5",
  "Köpek Tasması",
  "Kedi Maması",
  "Akvaryum Filtresi",
  "Villa Satılık",
];

export function PopularBoards() {
  const { t } = useI18n();
  const groups = categories.slice(0, 6);
  return (
    <div className="popular-boards">
      <section className="home-block">
        <div className="home-block-head">
          <h2>{t("home.popular.cats")}</h2>
          <Link href="/kategoriler">{t("cat.seeAll")}</Link>
        </div>
        <div className="popular-cat-cols">
          {groups.map((root) => (
            <div key={root.id} className="popular-col">
              <Link href={hrefForCategory(root)} className="popular-col-title">
                {catName(t, root.id, root.name)}
              </Link>
              <ul>
                {(root.children ?? []).slice(0, 7).map((ch) => (
                  <li key={ch.id}>
                    <Link href={hrefForCategory(ch)}>{catName(t, ch.id, ch.name)}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <section className="home-block">
        <div className="home-block-head">
          <h2>{t("home.popular.searches")}</h2>
        </div>
        <div className="popular-searches">
          {SEARCHES.map((q) => (
            <Link key={q} href={`/ara?q=${encodeURIComponent(q)}`} className="popular-search-chip">
              {q}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
