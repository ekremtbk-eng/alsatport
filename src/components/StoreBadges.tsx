"use client";

function PlayMark({ className = "h-8 w-8 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#EA4335" d="M8 6.2v35.6L28.4 24 8 6.2z" />
      <path fill="#FBBC04" d="M32.6 20.2 8 6.2 38.8 23.2z" />
      <path fill="#4285F4" d="M8 41.8 32.6 27.8 38.8 24.8 8 41.8z" />
      <path fill="#34A853" d="M28.4 24 32.6 20.2 38.8 24 32.6 27.8z" />
    </svg>
  );
}

function AppleGlyph({ className = "h-8 w-8 shrink-0" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.42 2.23-1.18 3.07-.79.88-2.09 1.56-3.2 1.47-.13-1.1.4-2.26 1.14-3.1.8-.9 2.17-1.57 3.24-1.44zM20.76 17.32c-.55 1.27-.82 1.84-1.53 2.96-1 .1.56-2.23-2.48-2.26-1.8-.03-2.16.93-3.57.93-1.42 0-1.86-.9-3.58-.93-1.8-.03-3.18 1.3-4.24 3.22C3.3 18.4 2 14.84 2 12.36c0-3.9 2.53-5.95 5.02-5.95 1.66 0 3.04.93 4.1.93 1.02 0 2.62-1.02 4.57-1.02 1.47 0 3.03.4 4.12 1.5-3.62 1.98-3.03 7.14.95 8.5z" />
    </svg>
  );
}

import { useI18n } from "@/context/I18nContext";

export function StoreBadges() {
  const { t } = useI18n();
  return (
    <div className="store-badges" aria-label={t("badge.aria")}>
      <a
        href="https://play.google.com/store"
        target="_blank"
        rel="noopener noreferrer"
        className="store-badge store-badge-play"
      >
        <PlayMark />
        <span className="store-badge-copy">
          <span className="store-badge-kicker">{t("badge.play.k")}</span>
          <span className="store-badge-title">{t("badge.play.t")}</span>
        </span>
      </a>
      <a
        href="https://www.apple.com/app-store/"
        target="_blank"
        rel="noopener noreferrer"
        className="store-badge store-badge-apple"
      >
        <AppleGlyph />
        <span className="store-badge-copy">
          <span className="store-badge-kicker">{t("badge.ios.k")}</span>
          <span className="store-badge-title">{t("badge.ios.t")}</span>
        </span>
      </a>
    </div>
  );
}
