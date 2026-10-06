"use client";

import Link from "next/link";
import { Instagram } from "lucide-react";
import { useCookies } from "@/context/CookieContext";
import { KvkkLink } from "@/components/LegalNoticeModal";
import { useI18n } from "@/context/I18nContext";
import { Logo } from "@/components/Logo";
import { SupportMailLink } from "@/components/SupportMailLink";
import { LEGAL_INSTAGRAM } from "@/data/legal";

export function SiteFooter() {
  const { openPrefs } = useCookies();
  const { t } = useI18n();
  return (
    <footer className="site-footer-pro">
      <div className="ft-inner">
        <div className="ft-bar">
          <Logo tone="dark" />
          <nav className="ft-links" aria-label={t("footer.explore")}>
            <Link href="/">{t("nav.home")}</Link>
            <Link href="/ara">{t("footer.allListings")}</Link>
            <Link href="/kategoriler">{t("footer.categories")}</Link>
            <Link href="/magazalar">{t("nav.stores")}</Link>
            <Link href="/kurumsal/hakkimizda">{t("corp.nav.hakkimizda")}</Link>
            <Link href="/kurumsal/iletisim">{t("corp.nav.iletisim")}</Link>
          </nav>
          <div className="ft-social">
            <a href={LEGAL_INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div className="ft-legal">
          <p>{t("footer.copy")}</p>
          <nav aria-label={t("footer.legal")}>
            <KvkkLink>{t("footer.kvkk")}</KvkkLink>
            <Link href="/gizlilik-politikasi">{t("footer.privacy")}</Link>
            <Link href="/cerez-aydinlatma">{t("footer.cookiePolicy")}</Link>
            <Link href="/kullanim-kosullari">{t("footer.terms")}</Link>
            <Link href="/ilan-kurallari">{t("footer.rules")}</Link>
            <button type="button" onClick={openPrefs}>
              {t("footer.cookies")}
            </button>
            <Link href="/kurumsal/iletisim">{t("footer.contact")}</Link>
          </nav>
          <SupportMailLink />
        </div>
      </div>
    </footer>
  );
}
