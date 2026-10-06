"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { SiteFooter } from "./SiteFooter";
import { AuthModalProvider } from "@/context/AuthModalContext";
import { CompareProvider } from "@/context/CompareContext";
import { CompletionGuard } from "./CompletionGuard";
import { LocationPrompt } from "./LocationPrompt";
import { CelebrationHost } from "./CelebrationHost";
import { NotificationToasts } from "./NotificationToasts";
import { useI18n } from "@/context/I18nContext";
import { isServicesPortalPath, ServicesPortalNav } from "@/components/ServicesPortalNav";
import { MobileSplash } from "@/components/home/MobileSplash";

const BARE = ["/welcome", "/giris", "/kayit", "/hesap-tamamla", "/hizmet-vermek-istiyorum"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { dir } = useI18n();
  const bare = BARE.includes(path);

  if (bare) {
    return (
      <div dir={dir}>
        <CompletionGuard />
        {children}
      </div>
    );
  }

  return (
    <AuthModalProvider>
      <CompareProvider>
      <div dir={dir} className={`app-shell min-h-screen${path === "/" ? " is-home" : ""}`}>
        <MobileSplash />
        <CompletionGuard />
        {isServicesPortalPath(path) ? <ServicesPortalNav /> : <Header />}
        <LocationPrompt />
        <CelebrationHost />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <BottomNav />
        <NotificationToasts />
      </div>
      </CompareProvider>
    </AuthModalProvider>
  );
}
