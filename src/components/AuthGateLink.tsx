"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { useAuthModal, type AuthModalReason } from "@/context/AuthModalContext";
import { postListingHref } from "@/lib/profile";

export function AuthGateLink({
  href,
  reason = "member",
  className,
  children,
  onClick,
  "aria-label": ariaLabel,
}: {
  href: string;
  reason?: AuthModalReason;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  const { user } = useApp();
  const { requireAuth } = useAuthModal();

  if (user) {
    const dest = href === "/ilan-ver" || href.startsWith("/ilan-ver?") ? postListingHref(user, href) : href;
    return (
      <Link href={dest} className={className} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  const loginHref = `/giris?next=${encodeURIComponent(href)}`;
  const pageGate =
    href.startsWith("/ilan-ver") ||
    href.startsWith("/mesajlar") ||
    href.startsWith("/profil") ||
    href.startsWith("/ilanlarim") ||
    href.startsWith("/favoriler");

  if (pageGate) {
    return (
      <Link href={loginHref} className={className} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={loginHref}
      className={className}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
        requireAuth(reason);
      }}
    >
      {children}
    </a>
  );
}
