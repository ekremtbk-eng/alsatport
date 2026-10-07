import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./business.css";
import "./smart-search.css";
import { AppProvider } from "@/context/AppContext";
import { CookieProvider } from "@/context/CookieContext";
import { LegalNoticeProvider } from "@/context/LegalNoticeContext";
import { I18nProvider } from "@/context/I18nContext";
import { DeviceProvider } from "@/context/DeviceContext";
import { AppShell } from "@/components/AppShell";
import { CookieConsent } from "@/components/CookieConsent";
import { FlashToast } from "@/components/FlashToast";
import { LegalNoticeModal } from "@/components/LegalNoticeModal";
import { JsonLd } from "@/components/JsonLd";
import { LEGAL_BRAND } from "@/data/legal";
import { REDUCED_MOTION_BOOT } from "@/lib/reducedMotion";
import {
  SEO_DESCRIPTION,
  SEO_KEYWORDS,
  SEO_TITLE,
  defaultOgImage,
  homeBreadcrumbJsonLd,
  homeWebPageJsonLd,
  jsonLdGraph,
  organizationJsonLd,
  siteNavigationJsonLd,
  topCategoryListJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { appOrigin } from "@/lib/site";
import { brandIcon } from "@/lib/brand";

const origin = appOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: { default: SEO_TITLE, template: "%s" },
  description: SEO_DESCRIPTION,
  applicationName: LEGAL_BRAND,
  keywords: SEO_KEYWORDS,
  authors: [{ name: "AlSatPort", url: origin }],
  creator: LEGAL_BRAND,
  publisher: LEGAL_BRAND,
  category: "classifieds",
  icons: {
    icon: [
      { url: brandIcon("/favicon.ico"), sizes: "any" },
      { url: brandIcon("/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
      { url: brandIcon("/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { url: brandIcon("/favicon-48x48.png"), sizes: "48x48", type: "image/png" },
      { url: brandIcon("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: brandIcon("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    shortcut: brandIcon("/favicon.ico"),
    apple: [{ url: brandIcon("/apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: LEGAL_BRAND,
    statusBarStyle: "default",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  openGraph: {
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    url: origin,
    siteName: LEGAL_BRAND,
    locale: "tr_TR",
    type: "website",
    images: [defaultOgImage()],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    images: [defaultOgImage().url],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#00c853",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <JsonLd
          data={jsonLdGraph([
            organizationJsonLd(),
            websiteJsonLd(),
            homeWebPageJsonLd(),
            homeBreadcrumbJsonLd(),
            siteNavigationJsonLd(),
            topCategoryListJsonLd(),
          ])}
        />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=JSON.parse(localStorage.getItem("alsatport-i18n-v1")||"{}");var m={tr:"tr",en:"en",de:"de",ar:"ar",ru:"ru"};if(p.locale&&m[p.locale]){document.documentElement.lang=m[p.locale];document.documentElement.dir=p.locale==="ar"?"rtl":"ltr";}}catch(e){}try{var w=window.innerWidth;var c=window.matchMedia("(pointer: coarse)").matches||(navigator.maxTouchPoints||0)>0;var d=w<768?"phone":(w<1024||(c&&w<1280)?"tablet":"desktop");var h=document.documentElement;h.dataset.device=d;h.classList.add("is-"+d);}catch(e){}${REDUCED_MOTION_BOOT}})();`,
          }}
        />
        <AppProvider>
          <DeviceProvider>
          <I18nProvider>
          <CookieProvider>
            <LegalNoticeProvider>
              <AppShell>{children}</AppShell>
              <FlashToast />
              <CookieConsent />
              <LegalNoticeModal />
            </LegalNoticeProvider>
          </CookieProvider>
          </I18nProvider>
          </DeviceProvider>
        </AppProvider>
      </body>
    </html>
  );
}
