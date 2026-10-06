"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { TermsOfServiceBody } from "@/components/TermsOfServiceBody";
import { useI18n } from "@/context/I18nContext";

export function AccountAgreementModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const node = (
    <div className="oauth-layer" role="dialog" aria-modal="true" aria-label={t("auth.terms.link")}>
      <button type="button" className="login-modal-backdrop" aria-label={t("common.close")} onClick={onClose} />
      <div className="agreement-box">
        <button type="button" className="login-modal-x" onClick={onClose} aria-label={t("common.close")}>
          <X className="h-5 w-5" />
        </button>
        <div className="agreement-body">
          <TermsOfServiceBody compact />
        </div>
        <button type="button" className="btn-primary h-11 w-full rounded-xl" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
  if (!ready) return null;
  return createPortal(node, document.body);
}
