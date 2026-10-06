"use client";

import { useState } from "react";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { apiPost } from "@/lib/security/client";
import { useI18n } from "@/context/I18nContext";
import { isValidEmail } from "@/lib/auth";

export function ForgotPasswordPanel({ initialEmail = "", onBack }: { initialEmail?: string; onBack?: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState(isValidEmail(initialEmail.trim()) ? initialEmail.trim() : "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!isValidEmail(value)) {
      setError("auth.err.email");
      return;
    }
    setError("");
    setBusy(true);
    const res = await apiPost<{ ok?: boolean; error?: string }>("/api/auth/forgot", { email: value });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "auth.err.server");
      return;
    }
    setSent(true);
  }

  return (
    <form className="auth-gate-form" onSubmit={(e) => void onSubmit(e)} noValidate>
      <div>
        <p className="m-0 text-base font-extrabold text-ink">{t("auth.forgot.title")}</p>
        <p className="m-0 mt-1 text-xs text-muted">{t("auth.forgot.hint")}</p>
      </div>

      {sent ? (
        <p role="status" className="forgot-sent">
          <MailCheck className="h-5 w-5 shrink-0" aria-hidden />
          <span>{t("auth.forgot.sent")}</span>
        </p>
      ) : (
        <>
          <label className="auth-gate-label">
            {t("contact.email")}
            <span className="auth-gate-field">
              <Mail className="h-4 w-4" aria-hidden />
              <input
                className="auth-gate-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.forgot.ph")}
                autoComplete="email"
                inputMode="email"
                enterKeyHint="send"
                autoFocus
              />
            </span>
          </label>
          {error ? <p className="m-0 text-xs font-semibold text-orange">{t(error)}</p> : null}
          <button type="submit" className="auth-gate-cta" disabled={busy}>
            {busy ? t("auth.connecting") : t("auth.forgot.submit")}
          </button>
        </>
      )}

      {onBack ? (
        <button type="button" className="auth-gate-forgot inline-flex items-center gap-1 self-start" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("auth.forgot.back")}
        </button>
      ) : null}
    </form>
  );
}
