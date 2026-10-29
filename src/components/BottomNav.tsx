"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Plus, Search, UserRound } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { AuthGateLink } from "@/components/AuthGateLink";

const NON_TEXT_INPUTS = new Set(["button", "checkbox", "radio", "range", "submit", "reset", "file", "color", "image"]);

/** True while a field that raises the on-screen keyboard has focus. */
function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(el.type);
}

export function BottomNav() {
  const path = usePathname();
  const { t } = useI18n();
  const [typing, setTyping] = useState(false);
  const items = [
    { href: "/", label: t("nav.vitrine"), icon: Home, active: path === "/" },
    {
      href: "/kategoriler",
      label: t("nav.arama"),
      icon: Search,
      active:
        path.startsWith("/kategoriler") ||
        path.startsWith("/ara") ||
        path.startsWith("/is-ilanlari") ||
        path.startsWith("/ustalar-hizmetler"),
    },
    { href: "/ilan-ver", label: t("nav.post"), icon: Plus, special: true, active: path.startsWith("/ilan-ver") },
    {
      href: "/servisler",
      label: t("nav.services"),
      icon: LayoutGrid,
      active: path.startsWith("/servisler") || path.startsWith("/acil"),
    },
    {
      href: "/profil",
      label: t("nav.banaOzel"),
      icon: UserRound,
      active:
        path.startsWith("/profil") ||
        path.startsWith("/mesajlar") ||
        path.startsWith("/favoriler") ||
        path.startsWith("/ilanlarim") ||
        path.startsWith("/bildirim"),
    },
  ];

  // The iOS keyboard lifts fixed bars over the field being typed in, so the nav steps aside meanwhile.
  useEffect(() => {
    const onIn = (e: FocusEvent) => setTyping(isTypingTarget(e.target));
    const onOut = () => window.setTimeout(() => setTyping(isTypingTarget(document.activeElement)), 0);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  return (
    <nav className={`bottom-nav fixed inset-x-0 bottom-0 z-50 ${typing ? "is-typing" : ""}`} aria-label={t("nav.vitrine")}>
      <ul className="grid grid-cols-5 px-1 pt-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon;
          if (item.special) {
            return (
              <li key={item.href} className="bn-post-wrap">
                <AuthGateLink href={item.href} className={`bn-post-link ${item.active ? "is-on" : ""}`}>
                  <span className="bn-post" aria-hidden>
                    <Icon className="relative z-10 h-7 w-7" strokeWidth={2.4} />
                  </span>
                  <span className="bn-post-label">{item.label}</span>
                </AuthGateLink>
              </li>
            );
          }
          const gated = item.href === "/profil";
          const inner = (
            <>
              <span className="relative">
                <Icon className="h-5 w-5" />
              </span>
              {item.label}
            </>
          );
          const className = `bn-item ${item.active ? "is-on" : ""}`;
          return (
            <li key={item.href}>
              {gated ? (
                <AuthGateLink href={item.href} className={className}>
                  {inner}
                </AuthGateLink>
              ) : (
                <Link href={item.href} className={className} aria-current={item.active ? "page" : undefined}>
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
