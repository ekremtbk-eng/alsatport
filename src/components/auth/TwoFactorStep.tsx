"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Clock3, Mail, MessageSquareText, RotateCw } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { OtpBoxes } from "@/components/auth/OtpBoxes";
import { BRAND_LOGO_LIGHT, BRAND_NAME } from "@/lib/brand";
import type { TwoFactorChallenge } from "@/lib/auth";
import { apiPost } from "@/lib/security/client";

type Channel = "primary" | "recovery" | "email";

function mmss(sec: number) {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Remaining seconds until a wall-clock deadline, re-rendered every second. */
function useCountdown(deadline: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadline]);
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

type OtpCredential = Credential & { code?: string };

export function TwoFactorStep({
  challenge,
  onBack,
  onDone,
}: {
  challenge: TwoFactorChallenge;
  onBack: () => void;
  onDone: (r: { needsProfile: boolean; needsEmailVerify: boolean }) => void;
}) {
  const { verifyLoginCode } = useApp();
  const { t } = useI18n();
  const [state, setState] = useState(challenge);
  const [otp, setOtp] = useState("");
  const [trust, setTrust] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + challenge.expiresIn * 1000);
  const [resendAt, setResendAt] = useState(() => Date.now() + challenge.resendIn * 1000);
  const expiresIn = useCountdown(expiresAt);
  const resendIn = useCountdown(resendAt);
  const submitting = useRef(false);

  const submit = useCallback(
    async (code: string) => {
      if (code.length !== 6 || submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setError("");
      setHint("");
      const res = await verifyLoginCode(code, trust);
      submitting.current = false;
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        setOtp("");
        if (res.error === "auth.2fa.expired") setTimeout(onBack, 1500);
        return;
      }
      onDone({ needsProfile: res.needsProfile, needsEmailVerify: !!res.needsEmailVerify });
    },
    [onBack, onDone, trust, verifyLoginCode],
  );

  /** Android Chrome reads the "@alsatport.com #123456" line of the SMS (WebOTP); other browsers rely on autocomplete="one-time-code". */
  useEffect(() => {
    if (state.method !== "sms" || typeof window === "undefined" || !("OTPCredential" in window)) return;
    const ac = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ["sms"] }, signal: ac.signal } as CredentialRequestOptions)
      .then((cred) => {
        const code = (cred as OtpCredential | null)?.code?.replace(/\D/g, "").slice(0, 6);
        if (code && code.length === 6) {
          setOtp(code);
          void submit(code);
        }
      })
      .catch(() => undefined);
    return () => ac.abort();
  }, [state.method, submit]);

  async function resend(to: Channel) {
    setBusy(true);
    setError("");
    setHint("");
    const res = await apiPost<{ ok: boolean; error?: string; resendIn?: number; expiresIn?: number } & Partial<TwoFactorChallenge>>(
      "/api/auth/login/resend",
      { to },
    );
    setBusy(false);
    if (!res.ok) {
      if (typeof res.resendIn === "number") setResendAt(Date.now() + res.resendIn * 1000);
      setError(res.error ?? "auth.err.server");
      return;
    }
    setState((s) => ({
      ...s,
      method: res.method ?? "email",
      maskedTarget: res.maskedTarget ?? res.maskedEmail ?? s.maskedTarget,
      maskedEmail: res.maskedEmail ?? s.maskedEmail,
      hasRecovery: !!res.hasRecovery,
      canEmail: !!res.canEmail,
      sandboxCode: res.sandboxCode,
    }));
    setExpiresAt(Date.now() + (res.expiresIn ?? 0) * 1000);
    setResendAt(Date.now() + (res.resendIn ?? 0) * 1000);
    setOtp("");
    setHint(t("auth.2fa.resent"));
  }

  const expired = expiresIn === 0;
  const sentKey = state.method === "sms" ? "auth.2fa.sentToPhone" : "auth.2fa.sentTo";
  const [before, after] = t(sentKey).split("{target}");

  return (
    <form
      className="auth-gate-form tfa-step"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(otp);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BRAND_LOGO_LIGHT.src}
        alt={BRAND_NAME}
        width={BRAND_LOGO_LIGHT.width}
        height={BRAND_LOGO_LIGHT.height}
        className="tfa-logo"
      />
      <div className="tfa-icon" aria-hidden>
        {state.method === "sms" ? <MessageSquareText className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
      </div>
      <h2 className="tfa-title">{t("auth.2fa.title")}</h2>
      <p className="tfa-sub">
        {before}
        <b className="tfa-target">{state.maskedTarget}</b>
        {after}
      </p>
      {state.sandboxCode ? (
        <p className="m-0 rounded-xl bg-elev px-3 py-2 text-center text-xs">
          {t("bilgi.inbox")}: <b className="tracking-widest">{state.sandboxCode}</b>
        </p>
      ) : null}

      <div className="tfa-code-head">
        <span>{t("auth.2fa.code")}</span>
        <span className={`tfa-timer${expired ? " is-out" : expiresIn <= 60 ? " is-low" : ""}`} aria-live="polite">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          {mmss(expiresIn)}
        </span>
      </div>
      <OtpBoxes
        value={otp}
        onChange={(v) => {
          setOtp(v);
          if (error) setError("");
        }}
        onComplete={(v) => void submit(v)}
        disabled={busy || expired}
        invalid={!!error}
        autoFocus
        label={t("auth.2fa.digit")}
      />

      {expired ? <p className="m-0 text-center text-xs font-semibold text-orange">{t("auth.2fa.codeExpired")}</p> : null}
      {error ? (
        <p className="m-0 text-center text-xs font-semibold text-orange" role="alert">
          {t(error)}
        </p>
      ) : null}
      {hint && !error ? <p className="m-0 text-center text-xs font-semibold text-lime">{hint}</p> : null}

      <label className="auth-gate-check">
        <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} />
        {t("auth.2fa.trust")}
      </label>
      <button type="submit" className="auth-gate-cta" disabled={busy || expired || otp.length !== 6}>
        {busy ? t("auth.connecting") : t("auth.2fa.submit")}
      </button>

      <div className="tfa-actions">
        <button type="button" className="tfa-resend" disabled={busy || resendIn > 0} onClick={() => void resend("primary")}>
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          {resendIn > 0 ? t("auth.2fa.resendIn").replace("{time}", mmss(resendIn)) : t("auth.2fa.resend")}
        </button>
        {state.canEmail ? (
          <button type="button" className="auth-gate-forgot" disabled={busy || resendIn > 0} onClick={() => void resend("email")}>
            {t("auth.2fa.useEmail")}
          </button>
        ) : null}
        {state.hasRecovery ? (
          <button type="button" className="auth-gate-forgot" disabled={busy || resendIn > 0} onClick={() => void resend("recovery")}>
            {t("auth.2fa.recovery")}
          </button>
        ) : null}
      </div>
      <button type="button" className="auth-gate-forgot tfa-back" onClick={onBack}>
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("auth.2fa.back")}
      </button>
    </form>
  );
}
