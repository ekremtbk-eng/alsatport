"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Heart,
  LayoutGrid,
  Menu,
  MessageCircle,
  Search,
  Store,
} from "lucide-react";
import { Logo } from "./Logo";
import { useApp } from "@/context/AppContext";
import { useState } from "react";
import { NotificationPanel } from "./NotificationPanel";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SearchSuggest } from "./SearchSuggest";
import { UserMenu } from "./UserMenu";
import { useI18n } from "@/context/I18nContext";
import { AuthGateLink } from "@/components/AuthGateLink";
import { LiveVisitorsBadge } from "@/components/home/LiveVisitorsBadge";
import { SiteSitelinksNav } from "@/components/SiteSitelinksNav";

export function Header() {
  const { unreadNotifications } = useApp();
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-panel/95 shadow-[0_1px_0_rgba(17,24,39,0.04),0_8px_24px_rgba(17,24,39,0.04)] backdrop-blur-xl">
      <div className="header-bar mx-auto flex max-w-[1400px] min-w-0 items-center gap-2 px-3 py-2.5 sm:gap-3 lg:px-5">
        <Logo />
        <form
          className="header-search min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/ara?q=${encodeURIComponent(q)}`);
          }}
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.search")}
              className="header-search-input h-11 w-full rounded-full border border-line bg-panel ps-10 pe-[6.5rem] text-sm text-slate-800 shadow-[0_6px_18px_-8px_rgba(15,23,42,0.28)] transition hover:shadow-[0_10px_24px_-10px_rgba(15,23,42,0.32)] focus:border-lime/40 focus:bg-panel focus:outline-none focus:ring-4 focus:ring-lime/12"
              autoComplete="off"
            />
            <button type="submit" className="header-search-go">
              {t("common.search")}
            </button>
            <SearchSuggest query={q} onPick={() => setQ("")} />
          </div>
        </form>
        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LiveVisitorsBadge compact />
          <LanguageSwitcher compact />
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-panel shadow-sm transition hover:-translate-y-0.5 hover:border-lime/40 hover:shadow-md"
              aria-label={t("nav.notifications")}
              data-notif-toggle
            >
              <Bell className="h-4 w-4 text-blue" />
              {unreadNotifications > 0 && (
                <span className="badge-vip absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px]">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
            <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
          </div>
          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
          <AuthGateLink href="/ilan-ver" className="header-post btn-primary h-10 px-4 text-sm">
            {t("nav.post")}
          </AuthGateLink>
        </div>
      </div>
      <nav className="header-desktop-nav border-t border-line/70">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-5 py-1.5 text-sm">
          <NavItem href="/kategoriler" icon={<Menu className="h-4 w-4" />} label={t("nav.categories")} />
          <NavItem href="/" icon={<LayoutGrid className="h-4 w-4" />} label={t("nav.vitrine")} />
          <NavItem href="/magazalar" icon={<Store className="h-4 w-4" />} label={t("nav.stores")} />
          <NavItem href="/favoriler" icon={<Heart className="h-4 w-4" />} label={t("nav.favorites")} gated />
          <NavItem href="/mesajlar" icon={<MessageCircle className="h-4 w-4" />} label={t("nav.messages")} gated />
        </div>
      </nav>
      <SiteSitelinksNav />
    </header>
  );
}

function NavItem({
  href,
  icon,
  label,
  gated,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  gated?: boolean;
}) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);
  const className = `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 ${
    active ? "bg-lime-deep text-lime" : "text-soft hover:bg-elev hover:text-ink"
  }`;
  const body = (
    <>
      {icon}
      {label}
    </>
  );
  if (gated) {
    return (
      <AuthGateLink href={href} className={className}>
        {body}
      </AuthGateLink>
    );
  }
  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}
