"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/context/I18nContext";
import { useApp } from "@/context/AppContext";
import { MailCheck } from "lucide-react";
import { SupportMailLink } from "@/components/SupportMailLink";

function VerifyInner() {
  const { t } = useI18n();
  const { user, startEmailVerify, logout } = useApp();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const ok = params.get("ok") === "1";
  const err = params.get("err") === "1";
  const sent = params.get("sent") === "1";
  const mailFail = params.get("mail") === "0";
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(sent ? t("auth.verify.sent") : "");
  const [error, setError] = useState(mailFail ? t("auth.err.mail") : "");

  useEffect(() => {
    if (!token || ok || err) return;
    window.location.replace(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  }, [token, ok, err]);

  async function resend() {
    setBusy(true);
    setError("");
    const res = await startEmailVerify();
    setBusy(false);
    if (!res.ok) {
      setError(t(res.error ?? "auth.err.mail"));
      return;
    }
    setHint(t("auth.verify.sent"));
  }

  if (ok) {
    return (
      <div className="mt-6 rounded-2xl border border-lime/30 bg-lime/10 p-5">
        <MailCheck className="h-8 w-8 text-lime" />
        <p className="mt-3 text-sm font-semibold text-ink">{t("auth.verify.ok")}</p>
        <Link href="/" className="mt-4 inline-flex text-sm font-bold text-lime">
          {t("nav.home")}
        </Link>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm font-semibold text-orange">{t("auth.verify.bad")}</p>
        <button type="button" className="btn-primary h-12 w-full" disabled={busy} onClick={() => void resend()}>
          {busy ? t("auth.connecting") : t("bilgi.sendLink")}
        </button>
      </div>
    );
  }

  if (token) {
    return <p className="mt-6 text-sm text-muted">{t("auth.connecting")}</p>;
  }

  if (!user) {
    return (
      <p className="mt-6 text-sm">
        <Link href="/giris" className="font-bold text-lime">
          {t("nav.login")}
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm leading-relaxed text-soft">
        {t("auth.verify.wait")}
        {user?.email ? (
          <>
            {" "}
            <span className="font-bold text-ink">{user.email}</span>
          </>
        ) : null}
      </p>
      {hint ? <p className="text-sm font-semibold text-lime">{hint}</p> : null}
      {error ? <p className="text-sm font-semibold text-orange">{error}</p> : null}
      <button type="button" className="btn-primary h-12 w-full" disabled={busy} onClick={() => void resend()}>
        {busy ? t("auth.connecting") : t("bilgi.sendLink")}
      </button>
      <SupportMailLink />
      <button type="button" className="text-sm font-bold text-muted" onClick={() => logout()}>
        {t("prof.logout")}
      </button>
    </div>
  );
}

export default function VerifyEmailPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-extrabold text-ink">{t("auth.verify.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("auth.verify.hint")}</p>
      <Suspense fallback={<p className="mt-6 text-sm text-muted">{t("auth.connecting")}</p>}>
        <VerifyInner />
      </Suspense>
    </div>
  );
}
