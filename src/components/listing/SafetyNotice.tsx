"use client";

import { useEffect, useId, useState } from "react";
import { ArrowUpRight, Info, X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

const GUIDE_KEYS = [
  "safe.guide.b1",
  "safe.guide.b2",
  "safe.guide.b3",
  "safe.guide.b4",
  "safe.guide.b5",
  "safe.guide.b6",
  "safe.guide.b7",
  "safe.guide.b8",
  "safe.guide.b9",
  "safe.guide.b10",
  "safe.guide.b11",
  "safe.guide.b12",
] as const;

export function SafetyNotice() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="safe-box" role="note">
        <Info className="safe-box-icon h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="safe-box-p">{t("safe.box.p")}</p>
          <button type="button" className="safe-box-more" onClick={() => setOpen(true)}>
            {t("safe.box.more")}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </aside>
      <SafetyGuideModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SafetyGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="legal-modal-overlay" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="legal-modal max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end border-b border-line px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-elev"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="legal-modal-scroll safe-guide px-5 py-5 sm:px-8 sm:py-6">
          <h2 id={titleId} className="safe-guide-title">
            {t("safe.guide.title")}
          </h2>
          <p className="safe-guide-hello">{t("safe.guide.hello")}</p>
          <p className="safe-guide-lead">{t("safe.guide.lead")}</p>
          <ul className="safe-guide-bullets">
            {GUIDE_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <p className="safe-guide-close">{t("safe.guide.close")}</p>
          <p className="safe-guide-egm">{t("safe.guide.egm")}</p>
        </div>
      </div>
    </div>
  );
}
