"use client";

import type { ReactNode } from "react";
import { useApp } from "@/context/AppContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { useI18n } from "@/context/I18nContext";

export function GuestLock({ children }: { children: ReactNode }) {
  const { user, hydrated } = useApp();
  const { requireAuth } = useAuthModal();
  const { t } = useI18n();

  if (!hydrated || user) return <>{children}</>;

  return (
    <div className="relative isolate min-h-[10rem]">
      <div
        aria-hidden
        className="pointer-events-none max-h-56 select-none overflow-hidden opacity-40 blur-[3px]"
      >
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-card/95 px-4 py-6 text-center shadow-sm">
        <p className="text-base font-extrabold text-ink">{t("auth.modal.join")}</p>
        <p className="max-w-sm text-sm text-muted">{t("auth.modal.detail")}</p>
        <button type="button" className="btn-primary mt-1 h-11 px-5 text-sm" onClick={() => requireAuth("member")}>
          {t("auth.modal.join")}
        </button>
      </div>
    </div>
  );
}
