"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { PasswordRules } from "@/components/PasswordRules";
import { apiPost } from "@/lib/security/client";
import { useI18n } from "@/context/I18nContext";
import { isStrongPassword } from "@/lib/security/passwordPolicy";

type Phase = "checking" | "invalid" | "form" | "done";

const TOKEN_KEY = "ap-reset-token";

/** Moves the token out of the address bar into this tab's sessionStorage so remounts keep it. */
function readToken() {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
  const fromUrl = fromHash || new URLSearchParams(window.location.search).get("token") || "";
  if (fromUrl) {
    try {
      sessionStorage.setItem(TOKEN_KEY, fromUrl);
    } catch {
      /* private mode */
    }
    window.history.replaceState(null, "", window.location.pathname);
    return fromUrl;
  }
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function forgetToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const value = readToken();
    setToken(value);
    if (!value) {
      setPhase("invalid");
      return;
    }
    void apiPost<{ ok?: boolean }>("/api/auth/reset/check", { token: value }).then((res) => {
      if (!res.ok) forgetToken();
      setPhase(res.ok ? "form" : "invalid");
    });
  }, []);

  useEffect(() => {
    if (phase !== "done") return;
    const id = window.setTimeout(() => router.replace("/giris?reset=1"), 2000);
    return () => window.clearTimeout(id);
  }, [phase, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isStrongPassword(password)) {
      setError("auth.err.passPolicy");
      return;
    }
    if (password !== confirm) {
      setError("auth.err.passMatch");
      return;
    }
    setBusy(true);
    const res = await apiPost<{ ok?: boolean; error?: string }>("/api/auth/reset", { token, password, confirm });
    setBusy(false);
    if (!res.ok) {
      if (res.error === "auth.reset.invalid") {
        forgetToken();
        setPhase("invalid");
      } else setError(res.error ?? "auth.err.server");
      return;
    }
    forgetToken();
    setPassword("");
    setConfirm("");
    setPhase("done");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-6">
        <h1 className="text-2xl font-extrabold text-ink">{t("auth.reset.title")}</h1>

        {phase === "checking" ? <p className="mt-4 text-sm text-muted">{t("auth.reset.checking")}</p> : null}

        {phase === "invalid" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm font-semibold text-orange">{t("auth.reset.invalid")}</p>
            <Link href="/giris?forgot=1" className="btn-primary inline-flex h-11 w-full items-center justify-center">
              {t("auth.reset.again")}
            </Link>
          </div>
        ) : null}

        {phase === "done" ? (
          <p role="status" className="forgot-sent mt-4">
            {t("auth.reset.redirect")}
          </p>
        ) : null}

        {phase === "form" ? (
          <form className="mt-5 space-y-3" onSubmit={(e) => void onSubmit(e)} noValidate>
            <label className="block text-sm font-semibold text-ink">
              {t("auth.reset.new")}
              <span className="relative mt-1 block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  className="dash-input w-full pl-9"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </span>
            </label>
            <PasswordRules value={password} />
            <label className="block text-sm font-semibold text-ink">
              {t("auth.reset.confirm")}
              <span className="relative mt-1 block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  className="dash-input w-full pl-9"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </span>
            </label>
            {error ? <p className="text-xs font-semibold text-orange">{t(error)}</p> : null}
            <button type="submit" className="btn-primary h-12 w-full" disabled={busy}>
              {busy ? t("auth.connecting") : t("auth.reset.submit")}
            </button>
          </form>
        ) : null}

        <Link href="/giris" className="mt-6 inline-flex text-sm font-bold text-lime">
          {t("nav.login")}
        </Link>
      </div>
    </div>
  );
}
