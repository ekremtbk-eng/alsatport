"use client";

import Link from "next/link";
import { useCookies } from "@/context/CookieContext";
import { FooterApps } from "@/components/FooterApps";
import { SocialIcon } from "@/components/BrandIcons";
import { KvkkLink } from "@/components/LegalNoticeModal";
import { useI18n } from "@/context/I18nContext";
import { Logo } from "@/components/Logo";
import { SupportMailLink } from "@/components/SupportMailLink";
import { LEGAL_UGC_NOTICE, SOCIAL_ACCOUNTS } from "@/data/legal";

export function SiteFooter() {
  const { openPrefs } = useCookies();
  const { t } = useI18n();
  return (
    <footer className="site-footer-pro">
      <div className="ft-inner">
        <div className="ft-bar">
          <div className="ft-brand">
            <Logo tone="dark" priority={false} />
            <div className="ft-follow">
              <p className="ft-h">{t("apps.follow")}</p>
              <ul className="ft-soc-list">
                {SOCIAL_ACCOUNTS.map((a) => (
                  <li key={a.id}>
                    {a.url ? (
                      <a className="ft-soc" href={a.url} target="_blank" rel="noopener noreferrer" aria-label={a.label} title={a.label}>
                        <SocialIcon id={a.id} />
                      </a>
                    ) : (
                      <span className="ft-soc is-soon" role="img" aria-label={`${a.label} · ${t("apps.soon")}`} title={`${a.label} · ${t("apps.soon")}`}>
                        <SocialIcon id={a.id} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <nav className="ft-links" aria-label={t("footer.explore")}>
            <Link href="/">{t("nav.home")}</Link>
            <Link href="/ara">{t("footer.allListings")}</Link>
            <Link href="/kategoriler">{t("footer.categories")}</Link>
            <Link href="/kurumsal-hesap">{t("footer.business")}</Link>
            <Link href="/kurumsal/hakkimizda">{t("corp.nav.hakkimizda")}</Link>
            <Link href="/kurumsal/iletisim">{t("corp.nav.iletisim")}</Link>
            <Link href="/marka-kiti">{t("brandkit.nav")}</Link>
          </nav>
        </div>
        <FooterApps />
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
        <p className="ft-ugc" lang="tr">
          {LEGAL_UGC_NOTICE}
        </p>
      </div>
    </footer>
  );
}
