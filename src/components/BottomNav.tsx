"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, MessageCircle, Plus, UserRound } from "lucide-react";
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
    { href: "/kategoriler", label: t("nav.categories"), icon: LayoutGrid },
    { href: "/ilan-ver", label: t("nav.post"), icon: Plus, special: true },
    { href: "/mesajlar", label: t("nav.messages"), icon: MessageCircle },
    { href: "/profil", label: t("nav.profile"), icon: UserRound },
  ];

  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-line bg-panel/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
      <ul className="grid grid-cols-5 px-1 pt-1.5">
        {items.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          if (item.special) {
            return (
              <li key={item.href} className="-mt-5 flex justify-center">
                <AuthGateLink
                  href={item.href}
                  className="btn-primary grid h-14 w-14 !rounded-full"
                >
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
                  <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-orange" />
                )}
              </span>
              {item.label}
            </>
          );
          const className = `relative flex flex-col items-center gap-0.5 py-1 text-[10px] ${
            active ? "text-lime" : "text-muted"
          }`;
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
