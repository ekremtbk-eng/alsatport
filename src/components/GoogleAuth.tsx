"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/context/I18nContext";
import { AppleMark, FacebookMark, GoogleMark } from "@/components/SocialMarks";
import { showFlashToast } from "@/components/FlashToast";
import type { SocialProvider } from "@/lib/oauth/identities";

export { GoogleMark, AppleMark, FacebookMark } from "@/components/SocialMarks";

const PROVIDERS: SocialProvider[] = ["google", "apple", "facebook"];

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

  const googleLabel = variant === "gate" ? t("auth.google.gate") : mode === "login" ? t("auth.google.login") : t("auth.google.reg");
  const appleLabel = variant === "gate" ? t("auth.apple.gate") : mode === "login" ? t("auth.apple.login") : t("auth.apple.reg");
  const facebookLabel = variant === "gate" ? t("auth.facebook.gate") : t("auth.facebook.continue");
  const btnClass = variant === "gate" ? "auth-gate-social" : "btn-social";
  const labels: Record<SocialProvider, string> = {
    google: googleLabel,
    apple: appleLabel,
    facebook: facebookLabel,
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
    const next = params.get("next") || "/profil";
    window.location.assign(`/api/auth/oauth/${provider}/start?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="auth-stack">
      {PROVIDERS.map((provider) => (
        <button
          key={provider}
          type="button"
          className={`${btnClass} ${provider === "apple" && variant !== "gate" ? "btn-apple" : ""}`}
          disabled={busy !== null}
          onClick={() => start(provider)}
        >
          {provider === "google" ? <GoogleMark /> : provider === "apple" ? <AppleMark /> : <FacebookMark />}
          <span>{busy === provider ? t("auth.connecting") : labels[provider]}</span>
        </button>
      ))}
    </div>
  );
}
