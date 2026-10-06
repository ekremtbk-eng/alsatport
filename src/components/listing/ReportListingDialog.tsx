"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { apiPost } from "@/lib/security/client";

export const REPORT_REASONS = [
  "misleading",
  "fraud",
  "prohibited",
  "copyright",
  "privacy",
  "inappropriate",
  "other",
] as const;
export type ReportReasonId = (typeof REPORT_REASONS)[number];

export function ReportListingDialog({
  listingId,
  open,
  onClose,
  onDone,
}: {
  listingId: string;
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState<ReportReasonId | "">("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setDetails("");
    setError("");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const needsDetails = reason === "other";
  const canSubmit = !!reason && (!needsDetails || details.trim().length >= 5) && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    const res = await apiPost<{ ok?: boolean; error?: string; duplicate?: boolean }>("/api/reports", {
      targetType: "listing",
      listingId,
      reason,
      details: details.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    onDone(t(res.duplicate ? "report.duplicate" : "admin.report.ok"));
    onClose();
  }

  return (
    <div className="legal-modal-overlay" onClick={onClose} role="presentation">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="legal-modal report-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <p id="report-dialog-title" className="text-sm font-extrabold sm:text-base">
            {t("report.title")}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl hover:bg-elev"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="legal-modal-scroll px-4 py-4 sm:px-5">
          <p className="text-xs text-muted">{t("report.lead")}</p>
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">{t("report.reason")}</legend>
            {REPORT_REASONS.map((id) => (
              <label key={id} className={`report-option${reason === id ? " is-on" : ""}`}>
                <input
                  type="radio"
                  name="reason"
                  value={id}
                  checked={reason === id}
                  onChange={() => setReason(id)}
                />
                <span>{t(`report.reason.${id}`)}</span>
              </label>
            ))}
          </fieldset>
          <label className="mt-3 block text-xs font-bold text-ink" htmlFor="report-details">
            {t(needsDetails ? "report.details.required" : "report.details")}
          </label>
          <textarea
            id="report-details"
            className="dash-input mt-1 min-h-[88px] w-full resize-y text-sm"
            maxLength={500}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t("report.details.ph")}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            {t("report.note")}{" "}
            <Link href="/ilan-kurallari" target="_blank" className="font-semibold text-lime underline">
              {t("footer.rules")}
            </Link>
          </p>
          {error ? <p className="mt-2 text-xs font-semibold text-orange">{error}</p> : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3 sm:px-5">
          <button type="button" className="btn-ghost h-10 px-4 text-sm" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn-orange h-10 px-4 text-sm" disabled={!canSubmit}>
            {busy ? t("report.sending") : t("report.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
