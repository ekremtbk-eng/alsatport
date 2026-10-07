"use client";

import Link from "next/link";
import { ArrowRight, Check, Store } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { BUSINESS_RETURN } from "@/lib/profile";

const BENEFITS = ["biz.auth.b1", "biz.auth.b2", "biz.auth.b3", "biz.auth.b4", "biz.auth.b5"] as const;

function Cta({ signedIn, onStart, className }: { signedIn: boolean; onStart: () => void; className: string }) {
  const { t } = useI18n();
  const body = (
    <>
      {t("biz.auth.cta")}
      <ArrowRight className="auth-biz-arrow h-4 w-4" aria-hidden />
    </>
  );
  if (signedIn) {
    return (
      <Link href={BUSINESS_RETURN} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={onStart}>
      {body}
    </button>
  );
}

/** Signed-out users only mark the intent; the application form itself stays behind login. */
export function BusinessAuthCard({ signedIn, onStart }: { signedIn: boolean; onStart: () => void }) {
  const { t } = useI18n();
  return (
    <aside className="auth-biz" aria-labelledby="auth-biz-title">
      <div className="auth-biz-full">
        <div className="auth-biz-top">
          <span className="auth-biz-icon">
            <Store className="h-5 w-5" aria-hidden />
          </span>
          <span className="auth-biz-badge">{t("biz.auth.badge")}</span>
        </div>
        <h2 id="auth-biz-title" className="auth-biz-title">
          {t("biz.auth.title")}
        </h2>
        <p className="auth-biz-text">{t("biz.auth.text")}</p>
        <ul className="auth-biz-list">
          {BENEFITS.map((key) => (
            <li key={key}>
              <Check className="h-4 w-4" aria-hidden />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        <Cta signedIn={signedIn} onStart={onStart} className="auth-biz-cta" />
        <p className="auth-biz-note">{t("biz.auth.note")}</p>
      </div>

      <div className="auth-biz-mini">
        <div className="auth-biz-mini-copy">
          <b>{t("biz.auth.miniTitle")}</b>
          <span>{t("biz.auth.miniText")}</span>
        </div>
        <Cta signedIn={signedIn} onStart={onStart} className="auth-biz-mini-cta" />
      </div>
    </aside>
  );
}
