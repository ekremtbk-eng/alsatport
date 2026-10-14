"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";

/** Shown while the session cannot be confirmed for a temporary reason (rate limit, server or network). */
export function SessionNotice() {
  const { sessionIssue, refreshSession } = useApp();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  if (!sessionIssue) return null;

  const retry = async () => {
    setBusy(true);
    await refreshSession();
    setBusy(false);
  };

  return (
    <div className="session-notice" role="status" data-issue={sessionIssue}>
      <p className="min-w-0 flex-1">{t(sessionIssue === "rateLimit" ? "session.busy" : "session.offline")}</p>
      <button type="button" className="session-notice-btn" onClick={() => void retry()} disabled={busy}>
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden />
        {t("session.retry")}
      </button>
    </div>
  );
}
