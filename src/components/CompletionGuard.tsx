"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { COMPLETE_PATH, isProfileComplete } from "@/lib/profile";
import { useI18n } from "@/context/I18nContext";

export function CompletionGuard() {
  const { user, hydrated } = useApp();
  const path = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hydrated || !user) {
      setOpen(false);
      return;
    }
    if (isProfileComplete(user)) {
      setOpen(false);
      return;
    }
    const skip =
      path === COMPLETE_PATH ||
      path === "/giris" ||
      path === "/kayit" ||
      path === "/welcome" ||
      path === "/hesap-tamamla" ||
      path === "/hizmet-vermek-istiyorum";
    if (skip) {
      setOpen(false);
      return;
    }
    try {
      if (sessionStorage.getItem(`ap-profile-nudge:${user.id}`) === "1") {
        setOpen(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [hydrated, user, path]);

  if (!open || !user || isProfileComplete(user)) return null;

  function dismiss() {
    try {
      if (user) sessionStorage.setItem(`ap-profile-nudge:${user.id}`, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/45 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-nudge-title"
        className="relative w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-lg"
      >
        <button
          type="button"
          className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-elev"
          aria-label={t("common.close")}
          onClick={dismiss}
        >
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs font-extrabold uppercase tracking-wider text-lime">{t("nav.profile")}</p>
        <h2 id="profile-nudge-title" className="mt-2 pe-8 text-lg font-extrabold text-ink">
          {t("nudge.h")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("nudge.p")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={COMPLETE_PATH} className="btn-primary h-11 px-4 text-sm" onClick={dismiss}>
            {t("nudge.update")}
          </Link>
          <button type="button" className="h-11 rounded-xl border border-line px-4 text-sm" onClick={dismiss}>
            {t("nudge.later")}
          </button>
        </div>
      </div>
    </div>
  );
}
