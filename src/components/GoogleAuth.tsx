"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/context/I18nContext";
import { AppleMark, GoogleMark } from "@/components/SocialMarks";
import { showFlashToast } from "@/components/FlashToast";
import type { SocialProvider } from "@/lib/oauth/identities";
import { LEGAL_SERVICES } from "@/lib/legalServices";
import { LegalText } from "@/components/legal/LegalText";

export { GoogleMark, AppleMark, FacebookMark } from "@/components/SocialMarks";

/** Only providers whose credentials are configured for this build are offered. */
export const SOCIAL_PROVIDERS = (["google", "apple"] as const).filter((p) => LEGAL_SERVICES[p]);

export function SocialAuth({
  mode,
  variant = "stack",
}: {
  mode: "login" | "register";
  onDone?: (needsProfile: boolean) => void;
  variant?: "stack" | "gate";
}) {
  const { t } = useI18n();
  const params = useSearchParams();
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  const googleLabel =
    variant === "gate"
      ? mode === "login"
        ? t("auth.google.gate")
        : t("auth.google.reg")
      : mode === "login"
        ? t("auth.google.login")
        : t("auth.google.reg");
  const appleLabel =
    variant === "gate"
      ? mode === "login"
        ? t("auth.apple.gate")
        : t("auth.apple.reg")
      : mode === "login"
        ? t("auth.apple.login")
        : t("auth.apple.reg");
  const btnClass = variant === "gate" ? "auth-gate-social" : "btn-social";
  const labels: Record<"google" | "apple", string> = {
    google: googleLabel,
    apple: appleLabel,
  };

  useEffect(() => {
    const code = params.get("oauth");
    if (!code) return;
    const key =
      code === "off"
        ? "auth.err.oauthOff"
        : code === "denied"
          ? "auth.err.oauthDenied"
          : code === "rate"
            ? "auth.err.rateLimit"
            : code === "email"
              ? "auth.err.email"
              : code === "mail"
                ? "auth.err.mail"
              : code === "state" || code === "csrf"
                ? "auth.err.csrf"
                : "auth.err.google";
    showFlashToast(t(key), "err");
    const url = new URL(window.location.href);
    url.searchParams.delete("oauth");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [params, t]);

  function start(provider: SocialProvider) {
    if (busy) return;
    setBusy(provider);
    const next = new URLSearchParams(window.location.search).get("next") || params.get("next") || "/profil";
    window.location.assign(`/api/auth/oauth/${provider}/start?next=${encodeURIComponent(next)}`);
  }

  if (!SOCIAL_PROVIDERS.length) return null;

  return (
    <div className="auth-stack">
      {SOCIAL_PROVIDERS.map((provider) => (
        <button
          key={provider}
          type="button"
          className={`${btnClass} ${provider === "apple" && variant !== "gate" ? "btn-apple" : ""}`}
          disabled={busy !== null}
          onClick={() => start(provider)}
        >
          {provider === "google" ? <GoogleMark /> : <AppleMark />}
          <span>{busy === provider ? t("auth.connecting") : labels[provider]}</span>
        </button>
      ))}
      {LEGAL_SERVICES.google ? <LegalText className="auth-oauth-note" text={t("auth.google.notice")} /> : null}
    </div>
  );
}
