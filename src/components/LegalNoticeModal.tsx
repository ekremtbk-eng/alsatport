"use client";

import { X } from "lucide-react";
import { LegalNoticeBody } from "@/components/LegalNoticeBody";
import { useLegalNotice } from "@/context/LegalNoticeContext";
import { useI18n } from "@/context/I18nContext";

export function LegalNoticeModal() {
  const { legalOpen, closeLegal } = useLegalNotice();
  const { t } = useI18n();
  if (!legalOpen) return null;

  return (
    <div
      className="legal-modal-overlay"
      onClick={closeLegal}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-notice-title"
        className="legal-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <p id="legal-notice-title" className="text-sm font-extrabold sm:text-base">
            {t("legal.title")}
          </p>
          <button
            type="button"
            onClick={closeLegal}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-elev"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="legal-modal-scroll px-4 py-5 sm:px-6">
          <LegalNoticeBody compact />
        </div>
      </div>
    </div>
  );
}

export function KvkkLink({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const { openLegal } = useLegalNotice();
  const { t } = useI18n();
  return (
    <a
      href="/cerez-aydinlatma"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openLegal();
      }}
    >
      {children ?? t("legal.title")}
    </a>
  );
}
