"use client";

import Link from "next/link";
import { AlertTriangle, SearchX } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

/** Full-page "not found" / "something went wrong" message with the way back. */
export function StatusScreen({ kind, onRetry }: { kind: "notFound" | "error"; onRetry?: () => void }) {
  const { t } = useI18n();
  const Icon = kind === "notFound" ? SearchX : AlertTriangle;
  return (
    <div className="status-screen" role={kind === "error" ? "alert" : undefined}>
      <span className={`status-ico ${kind === "error" ? "is-error" : ""}`} aria-hidden>
        <Icon className="h-7 w-7" />
      </span>
      {kind === "notFound" ? <p className="status-code">404</p> : null}
      <h1 className="status-h">{t(kind === "notFound" ? "nf.title" : "err.title")}</h1>
      <p className="status-sub">{t(kind === "notFound" ? "nf.body" : "err.body")}</p>
      <div className="status-actions">
        {onRetry ? (
          <button type="button" className="btn-primary status-btn" onClick={onRetry}>
            {t("err.retry")}
          </button>
        ) : null}
        <Link href="/" className={onRetry ? "btn-ghost status-btn" : "btn-primary status-btn"}>
          {t("nav.home")}
        </Link>
        {onRetry ? null : (
          <Link href="/kategoriler" className="btn-ghost status-btn">
            {t("search.browseCats")}
          </Link>
        )}
      </div>
    </div>
  );
}
