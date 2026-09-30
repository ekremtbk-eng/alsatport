"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PasswordRules } from "@/components/PasswordRules";
import { apiPost } from "@/lib/security/client";
import { useI18n } from "@/context/I18nContext";
import { isStrongPassword } from "@/lib/security/passwordPolicy";
import { Suspense } from "react";

function ResetForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isStrongPassword(password)) {
      setError(t("auth.err.passPolicy"));
      return;
    }
    setBusy(true);
    const res = await apiPost<{ ok?: boolean; error?: string }>("/api/auth/reset", { token, password });
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.server"));
      return;
    }
    setDone(true);
  }

  if (!token) {
    return <p className="mt-6 text-sm font-semibold text-orange">{t("auth.err.session")}</p>;
  }

  if (done) {
    return (
      <p className="mt-6 text-sm font-semibold text-lime">
        {t("auth.reset.ok")}{" "}
        <Link href="/giris" className="text-lime underline">
          {t("nav.login")}
        </Link>
      </p>
    );
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={(e) => void onSubmit(e)}>
      <input
        className="dash-input w-full"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <PasswordRules value={password} />
      {error ? <p className="text-xs font-semibold text-orange">{error}</p> : null}
      <button type="submit" className="btn-primary h-12 w-full" disabled={busy}>
        {busy ? t("auth.connecting") : t("auth.reset.submit")}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold text-ink">{t("auth.reset.title")}</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-muted">{t("auth.connecting")}</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
