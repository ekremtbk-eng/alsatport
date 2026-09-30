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
}: {
  href: string;
  reason?: AuthModalReason;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const { user } = useApp();
  const { requireAuth } = useAuthModal();

  if (user) {
    const dest = href === "/ilan-ver" || href.startsWith("/ilan-ver?") ? postListingHref(user, href) : href;
    return (
      <Link href={dest} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  const loginHref = `/giris?next=${encodeURIComponent(href)}`;
  return (
    <a
      href={loginHref}
      className={className}
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
