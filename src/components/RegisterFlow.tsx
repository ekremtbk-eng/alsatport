"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Info } from "lucide-react";
import { Logo } from "@/components/Logo";
import { SocialAuth } from "@/components/SocialAuth";
import { AccountAgreementModal } from "@/components/AccountAgreementModal";
import { PasswordRules } from "@/components/PasswordRules";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { isValidEmail } from "@/lib/auth";
import { isStrongPassword } from "@/lib/security/passwordPolicy";

export const AFTER_SIGNUP = "/eposta-dogrula?sent=1";

export function RegisterFlow({
  onClose,
  onLogin,
}: {
  onClose?: () => void;
  onLogin?: () => void;
}) {
  const { registerAccount } = useApp();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function goIn() {
    onClose?.();
    router.push("/eposta-dogrula?sent=1");
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("auth.err.email");
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError("auth.err.required");
      return;
    }
    if (!isStrongPassword(password)) {
      setError("auth.err.passPolicy");
      return;
    }
    if (!terms) {
      setError("auth.err.terms");
      return;
    }
    setBusy(true);
    setError("");
    const local = email.split("@")[0] || "uye";
    const res = await registerAccount({
      username: local,
      email,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      marketing,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    goIn();
  }

  return (
    <>
      <div className="signup-brand">
        <Logo linked={false} />
      </div>
      <h2 className="signup-title">{t("auth.signup.h")}</h2>

      <form className="signup-form" onSubmit={createAccount} noValidate>
        <label className="signup-field">
          <span>{t("contact.email")}</span>
          <span className="signup-input-wrap">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("contact.email")}
              className="signup-input"
              autoComplete="email"
              inputMode="email"
              autoFocus
            />
            <Info className="signup-info-ico" aria-hidden />
          </span>
        </label>
        <label className="signup-field">
          <span>{t("auth.firstName")}</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="signup-input"
            autoComplete="given-name"
          />
        </label>
        <label className="signup-field">
          <span>{t("auth.lastName")}</span>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="signup-input"
            autoComplete="family-name"
          />
        </label>
        <label className="signup-field">
          <span>{t("auth.pass")}</span>
          <span className="signup-input-wrap">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="signup-input"
              autoComplete="new-password"
            />
            <button
              type="button"
              className="signup-eye"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? t("auth.hidePass") : t("auth.showPass")}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        <PasswordRules value={password} />

        <label className="signup-check">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>
            {t("auth.terms.before")}
            {t("auth.terms.before") ? " " : null}
            <button
              type="button"
              className="signup-link"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setAgreement(true);
              }}
            >
              {t("auth.terms.link")}
            </button>
            {t("auth.terms.after") ? ` ${t("auth.terms.after")}` : null}
          </span>
        </label>
        <label className="signup-check">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
          <span>{t("auth.marketing")}</span>
        </label>

        {error ? <p className="signup-err">{t(error)}</p> : null}
        <button type="submit" className="btn-primary signup-cta" disabled={busy}>
          {busy ? t("auth.connecting") : t("auth.signup.email")}
        </button>
      </form>

      <div className="signup-social">
        <SocialAuth
          mode="register"
          onDone={() => {
            onClose?.();
          }}
        />
      </div>
      <p className="signup-store">
        {t("auth.signup.store")}{" "}
        <span className="signup-muted">{t("auth.signup.corporate")}</span>
      </p>
      <p className="signup-foot">
        {t("auth.hasAccount")}{" "}
        <button
          type="button"
          className="signup-link"
          onClick={() => {
            if (onLogin) onLogin();
            else router.push("/giris");
          }}
        >
          {t("nav.login")}
        </button>
      </p>

      {agreement ? <AccountAgreementModal onClose={() => setAgreement(false)} /> : null}
    </>
  );
}
