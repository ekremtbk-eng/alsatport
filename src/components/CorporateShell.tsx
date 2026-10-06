"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CORPORATE_NAV } from "@/data/corporate";
import { useI18n } from "@/context/I18nContext";

export function CorporateShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { t } = useI18n();

  return (
    <div className="corp-shell mx-auto max-w-[1400px] px-3 py-6 lg:px-5 lg:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">{t("corp.kicker")}</p>
      <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">
        AlSatPort
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">{t("corp.intro")}</p>

      <div className="corp-layout">
        <aside className="corp-aside">
          <nav
            aria-label={t("corp.menu")}
            className="corp-nav flex gap-2 overflow-auto no-scrollbar rounded-2xl border border-line bg-card p-2"
          >
            {CORPORATE_NAV.map((item) => {
              const on =
                path === item.href ||
                (item.slug === "haberler" && path.startsWith("/kurumsal/haberler"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    on
                      ? "bg-lime/12 text-lime ring-1 ring-lime/35"
                      : "text-soft hover:bg-elev hover:text-ink"
                  }`}
                >
                  {t(`corp.nav.${item.slug}`)}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1 rounded-3xl border border-line bg-card/70 p-5 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
