"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, ChevronDown, List, LogOut, PlusCircle, Settings, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { useI18n } from "@/context/I18nContext";
import { postListingHref } from "@/lib/profile";

export function UserMenu() {
  const { user, logout, hydrated } = useApp();
  const { t } = useI18n();
  const { openAuth, openRegister } = useAuthModal();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!hydrated) {
    return <div className="h-10 w-24 rounded-2xl border border-line bg-panel/40" />;
  }

  if (!user) {
    return (
      <div className="header-guest flex items-center gap-2">
        <button type="button" className="btn-ghost h-10 px-4 text-sm" onClick={() => openAuth("login")}>
          {t("nav.login")}
        </button>
        <button type="button" className="header-guest-signup btn-primary h-10 px-4 text-sm" onClick={() => openRegister()}>
          {t("nav.signup")}
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
        <span className="user-menu-name max-w-[9rem] truncate text-sm font-medium">
          {user.displayName}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="user-menu-panel">
          <div className="border-b border-line px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.displayName}</p>
            <p className="truncate text-[11px] text-muted">
              {user.email || `@${user.username}`}
            </p>
          </div>
          <Link href="/profil" className="user-menu-item" onClick={() => setOpen(false)}>
            <UserRound className="h-4 w-4" />
            {t("nav.profile")}
          </Link>
          <Link href="/profil/bilgilerim" className="user-menu-item" onClick={() => setOpen(false)}>
            <BadgeCheck className="h-4 w-4" />
            {t("dash.info.personal")}
          </Link>
          <Link href="/profil?p=ilanlarim" className="user-menu-item" onClick={() => setOpen(false)}>
            <List className="h-4 w-4" />
            {t("prof.listings")}
          </Link>
          <Link href={postListingHref(user)} className="user-menu-item" onClick={() => setOpen(false)}>
            <PlusCircle className="h-4 w-4" />
            {t("nav.post")}
          </Link>
          <Link href="/paketler" className="user-menu-item" onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4" />
            {t("footer.packages")}
          </Link>
          {user.role === "admin" ? (
            <Link href="/admin" className="user-menu-item" onClick={() => setOpen(false)}>
              <Shield className="h-4 w-4" />
              {t("admin.title")}
            </Link>
          ) : null}
          <button
            type="button"
            className="user-menu-item text-lime"
            onClick={() => {
              setOpen(false);
              logout();
              router.push("/");
            }}
          >
            <LogOut className="h-4 w-4" />
            {t("prof.logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
