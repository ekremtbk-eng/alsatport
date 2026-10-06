"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Plus, Search, UserRound } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { AuthGateLink } from "@/components/AuthGateLink";

export function BottomNav() {
  const path = usePathname();
  const { conversations } = useApp();
  const { t } = useI18n();
  const unread = conversations.reduce((a, c) => a + c.unread, 0);
  const items = [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/ara", label: t("nav.catHome"), icon: Search },
    { href: "/ilan-ver", label: t("nav.post"), icon: Plus, special: true },
    { href: "/mesajlar", label: t("nav.messages"), icon: MessageCircle },
    { href: "/profil", label: t("nav.profile"), icon: UserRound },
  ];

  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-50">
      <ul className="grid grid-cols-5 px-1 pt-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          if (item.special) {
            return (
              <li key={item.href} className="bn-post-wrap">
                <AuthGateLink href={item.href} className="bn-post" aria-label={item.label}>
                  <Icon className="relative z-10 h-7 w-7" strokeWidth={2.4} />
                </AuthGateLink>
              </li>
            );
          }
          const gated = item.href === "/mesajlar" || item.href === "/profil" || item.href === "/ilan-ver";
          const inner = (
            <>
              <span className="relative">
                <Icon className="h-5 w-5" />
                {item.href === "/mesajlar" && unread > 0 && (
                  <span className="bn-dot" />
                )}
              </span>
              {item.label}
            </>
          );
          const className = `bn-item ${active ? "is-on" : ""}`;
          return (
            <li key={item.href}>
              {gated ? (
                <AuthGateLink href={item.href} className={className}>
                  {inner}
                </AuthGateLink>
              ) : (
                <Link href={item.href} className={className}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
