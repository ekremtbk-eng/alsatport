"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Lock, Mail, MapPin, QrCode, ShieldCheck, Store, UserRound } from "lucide-react";
import { BusinessAuthCard } from "@/components/auth/BusinessAuthCard";
import { ForgotPasswordPanel } from "@/components/auth/ForgotPasswordPanel";
import { QrLoginPanel } from "@/components/auth/QrLoginPanel";
import { TwoFactorStep } from "@/components/auth/TwoFactorStep";
import type { TwoFactorChallenge } from "@/lib/auth";
import { SocialAuth } from "@/components/SocialAuth";
import { SOCIAL_PROVIDERS } from "@/components/GoogleAuth";
import { LegalText } from "@/components/legal/LegalText";
import { PasswordRules } from "@/components/PasswordRules";
import { AccountAgreementModal } from "@/components/AccountAgreementModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo } from "@/components/Logo";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { isValidEmail } from "@/lib/auth";
import { BUSINESS_RETURN, afterAuthHref, allowlistedReturn, isValidPhone } from "@/lib/profile";
import { isStrongPassword } from "@/lib/security/passwordPolicy";
import { apiGet } from "@/lib/security/client";
import { executeRecaptcha, preloadRecaptcha } from "@/lib/security/recaptchaClient";
import { RecaptchaNotice } from "@/components/RecaptchaNotice";
import { HOME_HUBS } from "@/data/homeHubs";

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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailExtra, setEmailExtra] = useState("");
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [bizIntent, setBizIntent] = useState(false);
  const gateRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setPassword("");
    setError("");
    setChallenge(null);
    setQrOpen(false);
    setForgotOpen(false);
  }, [tab]);

  useEffect(() => {
    if (variant !== "page") return;
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    if (email && isValidEmail(email)) setIdentifier(email);
    if (params.get("reset") === "1") setNotice("auth.reset.loginNow");
    if (params.get("forgot") === "1") setForgotOpen(true);
    setBizIntent(allowlistedReturn(params.get("next")) === BUSINESS_RETURN);
    if (params.get("tfa") === "1") {
      void apiGet<{ ok?: boolean; error?: string; twoFactor?: TwoFactorChallenge }>("/api/auth/login/verify")
        .then((res) => {
          if (res.ok && res.twoFactor) setChallenge(res.twoFactor);
          else setError(res.error ?? "auth.2fa.expired");
        })
        .catch(() => setError("auth.err.server"));
    }
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
    const html = document.documentElement;
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)");
    const timers: number[] = [];
    let keyboard = false;

    const pinned = () => getComputedStyle(root).position === "fixed";
    const editing = () => {
      const el = document.activeElement;
      return el instanceof HTMLElement && root.contains(el) && el.matches("input:not([type=checkbox]):not([type=radio]), textarea, select");
    };

    // Keeps the focused field inside its own scroll box; scrollIntoView would also scroll the page on iOS.
    const reveal = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || !editing()) return;
      let box = el.parentElement;
      while (box && box !== root) {
        const oy = getComputedStyle(box).overflowY;
        if ((oy === "auto" || oy === "scroll") && box.scrollHeight > box.clientHeight) break;
        box = box.parentElement;
      }
      if (!box || box === root) return;
      const field = el.getBoundingClientRect();
      const view = box.getBoundingClientRect();
      const margin = 16;
      if (field.top < view.top + margin) box.scrollTop -= view.top + margin - field.top;
      else if (field.bottom > view.bottom - margin) box.scrollTop += field.bottom - (view.bottom - margin);
    };

    const apply = () => {
      const height = vv?.height ?? window.innerHeight;
      const offset = vv?.offsetTop ?? 0;
      root.style.setProperty("--auth-vvh", `${Math.round(height)}px`);
      root.style.setProperty("--auth-vv-offset", `${Math.round(offset)}px`);
      html.classList.toggle("auth-lock", pinned());
      const next = touch.matches && editing();
      root.classList.toggle("is-kb", next);
      if (keyboard && !next && pinned() && window.scrollY !== 0) window.scrollTo(0, 0);
      keyboard = next;
      if (next) requestAnimationFrame(reveal);
    };
    const later = (ms: number) => timers.push(window.setTimeout(apply, ms));
    const onFocusChange = () => {
      apply();
      later(120);
      later(350);
    };
    const onOrientation = () => {
      later(150);
      later(500);
    };

    apply();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", onOrientation);
    root.addEventListener("focusin", onFocusChange);
    root.addEventListener("focusout", onFocusChange);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", onOrientation);
      root.removeEventListener("focusin", onFocusChange);
      root.removeEventListener("focusout", onFocusChange);
      html.classList.remove("auth-lock");
    };
  }, []);

  useEffect(() => {
    if (variant !== "overlay") return;
    document.documentElement.classList.add("auth-overlay-open");
    return () => document.documentElement.classList.remove("auth-overlay-open");
  }, [variant]);

  useEffect(() => {
    if (tab === "signup") preloadRecaptcha();
  }, [tab]);

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

  function chooseBusiness(on: boolean) {
    const url = new URL(window.location.href);
    if (on) url.searchParams.set("next", BUSINESS_RETURN);
    else if (allowlistedReturn(url.searchParams.get("next")) === BUSINESS_RETURN) url.searchParams.delete("next");
    window.history.replaceState(null, "", url.pathname + url.search);
    setBizIntent(on);
  }

  function startBusiness() {
    chooseBusiness(true);
    if (cardRef.current) cardRef.current.scrollTop = 0;
    for (const box of [gateRef.current, gateRef.current?.querySelector<HTMLElement>(".auth-gate-sheet")]) {
      if (box && box.scrollHeight > box.clientHeight) box.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" });
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
      if (res.twoFactor) {
        setPassword("");
        setChallenge(res.twoFactor);
        return;
      }
      finish(res.needsProfile, !!res.needsEmailVerify);
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
      className={`auth-gate ${variant === "overlay" ? "is-overlay" : "has-biz"}`}
      role={variant === "overlay" ? "dialog" : undefined}
      aria-modal={variant === "overlay" || undefined}
    >
      <div className="auth-gate-bg" aria-hidden />
      <div className="auth-gate-sheet">
        <div className="auth-gate-top">
          <Logo tone="dark" />
          <div className="auth-gate-top-actions">
            <LanguageSwitcher compact />
            <button type="button" className="auth-gate-home" onClick={goHome}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("auth.gate.home")}
            </button>
          </div>
        </div>

        <div className="auth-gate-layout">
          <aside className="auth-gate-promo">
            <p className="auth-gate-kicker">{t("auth.gate.kicker")}</p>
            <h1 className="auth-gate-slogan">{t("home.tag")}</h1>
            <p className="auth-gate-lead">{t("auth.gate.lead")}</p>
            <div className="auth-gate-feats">
              <div>
                <FileText className="h-5 w-5" aria-hidden />
                <b>{t("home.trust.pay")}</b>
                <small>{t("home.trust.pay.s")}</small>
              </div>
              <div>
                <ShieldCheck className="h-5 w-5" aria-hidden />
                <b>{t("home.trust.ver")}</b>
                <small>{t("home.why.p2")}</small>
              </div>
              <div>
                <MapPin className="h-5 w-5" aria-hidden />
                <b>{t("home.why.tr")}</b>
                <small>{t("home.why.p5")}</small>
              </div>
            </div>
          </aside>

          <section className="auth-gate-card" ref={cardRef}>
            <div className="auth-gate-scroll" hidden={tab === "login" && !!challenge}>
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

              {variant === "page" && tab === "signup" ? (
                <div className="auth-biz-choice" role="radiogroup" aria-label={t("biz.auth.typeLabel")}>
                  <button type="button" role="radio" aria-checked={!bizIntent} className={!bizIntent ? "is-on" : ""} onClick={() => chooseBusiness(false)}>
                    <UserRound className="h-4 w-4" aria-hidden />
                    {t("biz.auth.personal")}
                  </button>
                  <button type="button" role="radio" aria-checked={bizIntent} className={bizIntent ? "is-on" : ""} onClick={() => chooseBusiness(true)}>
                    <Store className="h-4 w-4" aria-hidden />
                    {t("biz.auth.business")}
                  </button>
                </div>
              ) : null}

              {variant === "page" && bizIntent ? (
                <p className="auth-biz-intent" role="status">
                  <Store className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{t(tab === "login" ? "biz.auth.noteLogin" : "biz.auth.noteSignup")}</span>
                  {tab === "login" ? (
                    <button type="button" onClick={() => chooseBusiness(false)}>
                      {t("biz.auth.cancel")}
                    </button>
                  ) : null}
                </p>
              ) : null}

              <SocialAuth
                mode={tab === "login" ? "login" : "register"}
                variant="gate"
                onDone={() => onClose?.()}
              />

              {SOCIAL_PROVIDERS.length ? (
                <div className="auth-gate-or">
                  <span>{t("auth.or")}</span>
                </div>
              ) : null}
            </div>

            {tab === "login" && challenge ? (
              <TwoFactorStep
                challenge={challenge}
                onBack={() => setChallenge(null)}
                onDone={(r) => finish(r.needsProfile, r.needsEmailVerify)}
              />
            ) : tab === "login" && forgotOpen ? (
              <ForgotPasswordPanel initialEmail={identifier} onBack={() => setForgotOpen(false)} />
            ) : tab === "login" && qrOpen ? (
              <div className="auth-gate-form">
                <QrLoginPanel onDone={(r) => finish(r.needsProfile, r.needsEmailVerify)} />
                <button type="button" className="auth-gate-forgot inline-flex items-center gap-1 self-start" onClick={() => setQrOpen(false)}>
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("qr.login.back")}
                </button>
              </div>
            ) : (
            <form className="auth-gate-form" ref={formRef} onSubmit={(e) => void onContinue(e)}>
              {tab === "signup" ? (
                <div className="auth-gate-names">
                  <label className="auth-gate-label">
                    {t("auth.firstName")}
                    <span className="auth-gate-field">
                      <UserRound className="h-4 w-4" aria-hidden />
                      <input
                        className="auth-gate-input"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                      />
                    </span>
                  </label>
                  <label className="auth-gate-label">
                    {t("auth.lastName")}
                    <span className="auth-gate-field">
                      <UserRound className="h-4 w-4" aria-hidden />
                      <input
                        className="auth-gate-input"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                      />
                    </span>
                  </label>
                </div>
              ) : null}

              <label className="auth-gate-label">
                {t("auth.gate.contact")}
                <span className="auth-gate-field">
                  <Mail className="h-4 w-4" aria-hidden />
                  <input
                    className="auth-gate-input"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={t("auth.gate.contactPh")}
                    autoComplete={tab === "login" ? "username" : "email"}
                    inputMode="email"
                    enterKeyHint="go"
                  />
                </span>
              </label>

              {tab === "signup" && phoneId ? (
                <label className="auth-gate-label">
                  {t("contact.email")}
                  <span className="auth-gate-field">
                    <Mail className="h-4 w-4" aria-hidden />
                    <input
                      className="auth-gate-input"
                      value={emailExtra}
                      onChange={(e) => setEmailExtra(e.target.value)}
                      autoComplete="email"
                    />
                  </span>
                </label>
              ) : null}

              <label className="auth-gate-label">
                {t("auth.pass")}
                <span className="auth-gate-field">
                  <Lock className="h-4 w-4" aria-hidden />
                  <input
                    type="password"
                    className="auth-gate-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={tab === "login" ? "current-password" : "new-password"}
                  />
                </span>
              </label>

              {tab === "signup" ? <PasswordRules value={password} /> : null}

              {tab === "login" ? (
                <div className="auth-gate-row">
                  <span />
                  <button
                    type="button"
                    className="auth-gate-forgot"
                    onClick={() => {
                      setError("");
                      setForgotOpen(true);
                    }}
                  >
                    {t("auth.forgot.link")}
                  </button>
                </div>
              ) : (
                <>
                  <label className="auth-gate-check">
                    <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                    <span>
                      {t("auth.terms.before")}
                      {t("auth.terms.before") ? " " : null}
                      <button type="button" className="auth-gate-legal-link" onClick={() => setAgreement(true)}>
                        {t("auth.terms.link")}
                      </button>
                      {t("auth.terms.after")}
                    </span>
                  </label>
                  <LegalText className="auth-gate-legal" text={t("auth.kvkkInfo")} />
                  <label className="auth-gate-check">
                    <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                    <span>{t("auth.marketing")}</span>
                  </label>
                </>
              )}

              {notice && tab === "login" ? (
                <p role="status" className="m-0 text-xs font-semibold text-lime">
                  {t(notice)}
                </p>
              ) : null}
              {error ? <p className="m-0 text-xs font-semibold text-orange">{t(error)}</p> : null}

              {tab === "signup" ? <RecaptchaNotice /> : null}

              <button type="submit" className="auth-gate-cta" disabled={busy}>
                {busy ? t("auth.connecting") : tab === "login" ? t("nav.login") : t("nav.signup")}
              </button>

              {tab === "login" ? (
                <button type="button" className="auth-gate-qr-btn" onClick={() => setQrOpen(true)}>
                  <QrCode className="h-4 w-4" aria-hidden /> {t("qr.login.cta")}
                </button>
              ) : null}

              {tab === "login" ? <LegalText className="auth-gate-legal" text={t("auth.gate.legal")} /> : null}
            </form>
            )}
          </section>

          {variant === "page" ? <BusinessAuthCard signedIn={!!user} onStart={startBusiness} /> : null}
        </div>

        <nav className="auth-gate-cats" aria-label={t("nav.categories")}>
          {HOME_HUBS.map((hub) => (
            <Link key={hub.id} href={hub.href} className="auth-gate-cat">
              <span>
                <CategoryIcon name={hub.icon} className="h-5 w-5" />
              </span>
              <em>{hub.label}</em>
            </Link>
          ))}
        </nav>
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
