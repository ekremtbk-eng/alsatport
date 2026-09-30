"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { RegisterFlow } from "@/components/RegisterFlow";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";

export function RegisterModal({
  open,
  onClose,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
}) {
  const { user } = useApp();
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open && user) onClose();
  }, [open, user, onClose]);

  if (!open) return null;

  return (
    <div className="login-modal-root signup-root" role="presentation">
      <button type="button" className="login-modal-backdrop" aria-label={t("common.close")} onClick={onClose} />
      <div className="signup-modal" role="dialog" aria-modal="true">
        <button type="button" className="login-modal-x" onClick={onClose} aria-label={t("common.close")}>
          <X className="h-5 w-5" />
        </button>
        <RegisterFlow onClose={onClose} onLogin={onLogin} />
      </div>
    </div>
  );
}
