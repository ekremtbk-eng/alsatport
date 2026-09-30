"use client";

import Link from "next/link";
import { useCookies } from "@/context/CookieContext";
import { StoreBadges } from "@/components/StoreBadges";
import { KvkkLink } from "@/components/LegalNoticeModal";
import { CORPORATE_NAV } from "@/data/corporate";
import { useI18n } from "@/context/I18nContext";
import { AuthGateLink } from "@/components/AuthGateLink";
import { SupportMailLink } from "@/components/SupportMailLink";
import { SITE_SITELINKS } from "@/data/sitelinks";

export function SiteFooter() {
  const { openPrefs } = useCookies();
  const { t } = useI18n();
  return (
    <footer className="mt-10 border-t border-line/80 px-4 py-10 text-xs text-muted">
      <div className="mx-auto grid max-w-[1400px] gap-8 text-left sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-sm font-extrabold text-ink">{t("footer.categories")}</p>
          <nav className="mt-3 flex flex-col gap-2" aria-label={t("footer.categories")}>
            {SITE_SITELINKS.map((item) => (
              <Link key={item.id} href={item.href} className="hover:text-lime">
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="text-sm font-extrabold text-ink">{t("footer.corporate")}</p>
          <nav className="mt-3 flex flex-col gap-2">
            {CORPORATE_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-lime">
                {t(`corp.nav.${item.slug}`)}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <p className="text-sm font-extrabold text-ink">{t("footer.explore")}</p>
          <nav className="mt-3 flex flex-col gap-2">
            <Link href="/kategoriler" className="hover:text-lime">
              {t("nav.categories")}
            </Link>
            <Link href="/magazalar" className="hover:text-lime">
              {t("nav.stores")}
            </Link>
            <Link href="/paketler" className="hover:text-lime">
              {t("footer.packages")}
            </Link>
            <Link href="/odeme" className="hover:text-lime">
              {t("nav.checkout")}
            </Link>
            <AuthGateLink href="/ilan-ver" className="hover:text-lime">
              {t("nav.post")}
            </AuthGateLink>
          </nav>
        </div>
        <div>
          <p className="text-sm font-extrabold text-ink">{t("footer.legal")}</p>
          <nav className="mt-3 flex flex-col gap-2">
            <KvkkLink className="hover:text-lime text-left">{t("footer.kvkk")}</KvkkLink>
            <Link href="/gizlilik-politikasi" className="hover:text-lime">
              {t("footer.privacy")}
            </Link>
            <Link href="/kullanim-kosullari" className="hover:text-lime">
              {t("footer.terms")}
            </Link>
            <Link href="/mesafeli-satis" className="hover:text-lime">
              {t("footer.distance")}
            </Link>
            <Link href="/on-bilgilendirme" className="hover:text-lime">
              {t("footer.preinfo")}
            </Link>
            <KvkkLink className="hover:text-lime text-left">KVKK</KvkkLink>
            <button type="button" onClick={openPrefs} className="text-left hover:text-lime">
              {t("footer.cookies")}
            </button>
          </nav>
        </div>
        <div>
          <p className="text-sm font-extrabold text-ink">AlSatPort</p>
          <p className="mt-3 leading-relaxed text-soft">{t("footer.tagline")}</p>
          <p className="mt-2 leading-relaxed">{t("footer.blurb")}</p>
          <p className="mt-4 text-xs leading-relaxed text-muted">{t("footer.supportHint")}</p>
          <SupportMailLink />
        </div>
      </div>
      <StoreBadges />
      <p className="mt-4 text-center">{t("footer.copy")}</p>
    </footer>
  );
}
