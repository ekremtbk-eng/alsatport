"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SocialAuth } from "@/components/SocialAuth";
import { PasswordRules } from "@/components/PasswordRules";
import { AccountAgreementModal } from "@/components/AccountAgreementModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { isValidEmail } from "@/lib/auth";
import { afterAuthHref, isValidPhone } from "@/lib/profile";
import { isStrongPassword } from "@/lib/security/passwordPolicy";
import { executeRecaptcha } from "@/lib/security/recaptchaClient";
import { RecaptchaNotice } from "@/components/RecaptchaNotice";

export type AuthTab = "login" | "signup";

export function AuthStage({
  tab,
  onTab,
  variant = "page",
  onClose,
  promptKey,
}: {
  tab: AuthTab;
  onTab: (next: AuthTab) => void;
  variant?: "page" | "overlay";
  onClose?: () => void;
  promptKey?: string;
}) {
  const { loginWithPassword, registerAccount, user } = useApp();
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<"id" | "more">("id");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailExtra, setEmailExtra] = useState("");
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const gateRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setStep("id");
    setPassword("");
    setError("");
  }, [tab]);

  useEffect(() => {
    if (variant !== "page") return;
    const email = new URLSearchParams(window.location.search).get("email");
    if (email && isValidEmail(email)) setIdentifier(email);
  }, [variant]);

  useEffect(() => {
    if (variant === "overlay" && user) {
      onClose?.();
      if (user.emailVerified === false) router.push("/eposta-dogrula?sent=1");
    }
  }, [variant, user, onClose, router]);

  useEffect(() => {
    const root = gateRef.current;
    const vv = window.visualViewport;
    if (!root) return;
    const apply = () => {
      const height = vv?.height ?? window.innerHeight;
      const offset = vv?.offsetTop ?? 0;
      root.style.setProperty("--auth-vvh", `${Math.round(height)}px`);
      root.style.setProperty("--auth-vv-offset", `${Math.round(offset)}px`);
    };
    apply();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  useEffect(() => {
    if (variant !== "overlay") return;
    document.documentElement.classList.add("auth-overlay-open");
    return () => document.documentElement.classList.remove("auth-overlay-open");
  }, [variant]);

  const phoneId = looksPhone(identifier);
  const emailId = isValidEmail(identifier.trim());

  function goHome() {
    if (variant === "overlay") {
      onClose?.();
      return;
    }
    router.push("/");
  }

  function finish(needsProfile: boolean, needsEmailVerify = false) {
    if (remember) localStorage.setItem("alsatport-remember", "1");
    else localStorage.removeItem("alsatport-remember");
    onClose?.();
    const dest = afterAuthHref(needsProfile, variant === "overlay", needsEmailVerify);
    if (dest) router.push(dest);
  }

  function switchTab(next: AuthTab) {
    onTab(next);
    if (variant === "page") {
      const qs = window.location.search;
      window.history.replaceState(null, "", (next === "login" ? "/giris" : "/kayit") + qs);
    }
  }

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const id = identifier.trim();
    if (!id) {
      setError("auth.err.required");
      return;
    }
    if (!emailId && !phoneId) {
      setError("auth.err.contact");
      return;
    }
    if (step === "id") {
      setStep("more");
      return;
    }
    if (tab === "login") {
      if (!isStrongPassword(password)) {
        setError("auth.err.passPolicy");
        return;
      }
      setBusy(true);
      const res = await loginWithPassword(id, password);
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      finish(res.needsProfile, res.ok ? !!res.needsEmailVerify : false);
      return;
    }

    const mail = emailId ? id : emailExtra.trim();
    if (!isValidEmail(mail)) {
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
    const recaptchaToken = await executeRecaptcha("register");
    if (!recaptchaToken) {
      setBusy(false);
      setError("auth.err.recaptcha");
      return;
    }
    const local = mail.split("@")[0] || "uye";
    const res = await registerAccount({
      username: local,
      email: mail,
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      marketing,
      phone: phoneId ? identifier.replace(/\D/g, "") : undefined,
      recaptchaToken,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    finish(true, true);
  }

  return (
    <div
      ref={gateRef}
      className={`auth-gate ${variant === "overlay" ? "is-overlay" : ""}`}
      role={variant === "overlay" ? "dialog" : undefined}
      aria-modal={variant === "overlay" || undefined}
    >
      <div className="auth-gate-bg" aria-hidden />
      <div className="auth-gate-sheet">
      <div className="auth-gate-top">
        <LanguageSwitcher compact />
        <button type="button" className="auth-gate-home" onClick={goHome}>
          {t("auth.gate.home")}
        </button>
      </div>

      <div className="auth-gate-layout">
        <aside className="auth-gate-promo">
          <p className="auth-gate-brand">
            Al<span>Sat</span>Port
          </p>
          <p className="auth-gate-kicker">{t("auth.gate.kicker")}</p>
          <h1 className="auth-gate-slogan">{t("auth.gate.slogan")}</h1>
          <div className="auth-gate-cards">
            <p>{t("auth.gate.card1")}</p>
            <p>{t("auth.gate.card2")}</p>
          </div>
        </aside>

        <section className="auth-gate-card">
          <div className="auth-gate-scroll">
          {promptKey ? <p className="mb-3 text-center text-sm font-extrabold text-ink">{t(promptKey)}</p> : null}
          <div className="auth-gate-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "login"}
              className={tab === "login" ? "is-on" : ""}
              onClick={() => switchTab("login")}
            >
              {t("nav.login")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "signup"}
              className={tab === "signup" ? "is-on" : ""}
              onClick={() => switchTab("signup")}
            >
              {t("nav.signup")}
            </button>
          </div>

          <SocialAuth
            mode={tab === "login" ? "login" : "register"}
            variant="gate"
            onDone={() => {
              if (remember) localStorage.setItem("alsatport-remember", "1");
              else localStorage.removeItem("alsatport-remember");
              onClose?.();
            }}
          />

          <p className="auth-gate-legal">
            {t("auth.gate.legal")}{" "}
            <Link href="/kvkk" className="auth-gate-legal-link">{t("auth.gate.kvkk")}</Link>{t("auth.gate.legalEnd")}
            {" · "}
            <Link href="/gizlilik-politikasi" className="auth-gate-legal-link">{t("footer.privacy")}</Link>
            {" · "}
            <Link href="/kullanim-kosullari" className="auth-gate-legal-link">{t("footer.terms")}</Link>
          </p>

          <div className="auth-gate-or">
            <span>{t("auth.or")}</span>
          </div>
          </div>

          <form className="auth-gate-form" ref={formRef} onSubmit={(e) => void onContinue(e)}>
            <label className="auth-gate-label">
              {t("auth.gate.contact")}
              <input
                className="auth-gate-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t("auth.gate.contactPh")}
                autoComplete={tab === "login" ? "username" : "email"}
                inputMode="email"
                enterKeyHint="go"
              />
            </label>

            {step === "more" && tab === "login" ? (
              <>
              <label className="auth-gate-label">
                {t("auth.pass")}
                <input
                  type="password"
                  className="auth-gate-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <Link href="/sifre-unuttum" className="auth-gate-legal-link text-sm">
                {t("auth.forgot.link")}
              </Link>
              </>
            ) : null}

            {step === "more" && tab === "signup" ? (
              <>
                {phoneId ? (
                  <label className="auth-gate-label">
                    {t("contact.email")}
                    <input
                      className="auth-gate-input"
                      value={emailExtra}
                      onChange={(e) => setEmailExtra(e.target.value)}
                      autoComplete="email"
                    />
                  </label>
                ) : null}
                <label className="auth-gate-label">
                  {t("auth.firstName")}
                  <input
                    className="auth-gate-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                  />
                </label>
                <label className="auth-gate-label">
                  {t("auth.lastName")}
                  <input
                    className="auth-gate-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                  />
                </label>
                <label className="auth-gate-label">
                  {t("auth.pass")}
                  <input
                    type="password"
                    className="auth-gate-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
                <PasswordRules value={password} />
                <label className="auth-gate-check">
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                  <span>
                    {t("auth.terms.before")}
                    {t("auth.terms.before") ? " " : null}
                    <button
                      type="button"
                      className="auth-gate-legal-link"
                      onClick={() => setAgreement(true)}
                    >
                      {t("auth.terms.link")}
                    </button>
                    {t("auth.terms.after") ? ` ${t("auth.terms.after")}` : null}
                  </span>
                </label>
                <label className="auth-gate-check">
                  <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                  <span>{t("auth.marketing")}</span>
                </label>
              </>
            ) : null}

            <label className="auth-gate-check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {t("auth.remember")}
            </label>

            {error ? <p className="m-0 text-xs font-semibold text-orange">{t(error)}</p> : null}

            {tab === "signup" ? <RecaptchaNotice /> : null}

            <button type="submit" className="auth-gate-cta" disabled={busy}>
              {busy ? t("auth.connecting") : t("auth.gate.continue")}
            </button>
          </form>
        </section>
      </div>
      <p className="auth-gate-foot">{t("auth.gate.foot")}</p>
      </div>

      {agreement ? <AccountAgreementModal onClose={() => setAgreement(false)} /> : null}
    </div>
  );
}

function looksPhone(value: string) {
  const d = value.replace(/\D/g, "");
  if (value.includes("@")) return false;
  return isValidPhone(d);
}
