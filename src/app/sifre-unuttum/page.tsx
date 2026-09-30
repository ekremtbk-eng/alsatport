"use client";

import { useState } from "react";
import Link from "next/link";
import { apiPost } from "@/lib/security/client";
import { useI18n } from "@/context/I18nContext";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await apiPost<{ ok?: boolean; error?: string }>("/api/auth/forgot", { email });
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setDone(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold text-ink">{t("auth.forgot.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("auth.forgot.hint")}</p>
      {done ? (
        <p className="mt-6 text-sm font-semibold text-lime">{t("auth.forgot.sent")}</p>
      ) : (
        <form className="mt-6 space-y-3" onSubmit={(e) => void onSubmit(e)}>
          <input
            className="dash-input w-full"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("contact.email")}
          />
          {error ? <p className="text-xs font-semibold text-orange">{error}</p> : null}
          <button type="submit" className="btn-primary h-12 w-full" disabled={busy}>
            {busy ? t("auth.connecting") : t("auth.forgot.submit")}
          </button>
        </form>
      )}
      <Link href="/giris" className="mt-6 inline-flex text-sm font-bold text-lime">
        {t("nav.login")}
      </Link>
    </div>
  );
}
