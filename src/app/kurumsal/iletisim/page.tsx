"use client";

import { useState } from "react";
import { LEGAL_BRAND, LEGAL_INSTAGRAM, LEGAL_EMAIL_DESTEK, LEGAL_PRIVACY_EMAIL } from "@/data/legal";
import { useI18n } from "@/context/I18nContext";
import { SupportMailLink } from "@/components/SupportMailLink";
import { KvkkLink } from "@/components/LegalNoticeModal";

const SUBJECTS = ["genel", "basin", "is", "ik"] as const;

export default function ContactPage() {
  const { t } = useI18n();
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>("genel");
  const [message, setMessage] = useState("");

  const mailto = `mailto:${LEGAL_EMAIL_DESTEK}?subject=${encodeURIComponent(
    `${LEGAL_BRAND} – ${t(`contact.${subject}`)}`,
  )}&body=${encodeURIComponent(message)}`;

  return (
    <article>
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t("contact.kicker")}</p>
      <h2 className="mt-1 text-2xl font-extrabold">{t("contact.h")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-soft">{t("contact.p")}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-4 text-sm">
          <p className="font-extrabold">{LEGAL_BRAND}</p>
          <div className="mt-3">
            <SupportMailLink variant="card" />
          </div>
          <p className="mt-2 break-words">
            {t("contact.privacy")}{" "}
            <a className="text-lime" href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>
              {LEGAL_PRIVACY_EMAIL}
            </a>
          </p>
          <p className="mt-1 text-xs text-muted">
            <KvkkLink className="text-lime underline" />
          </p>
          <a className="footer-ig mt-3" href={LEGAL_INSTAGRAM} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-4 text-sm text-soft">
          <p className="font-extrabold text-ink">{t("contact.hours")}</p>
          <p className="mt-2">{t("contact.week")}</p>
          <p>{t("contact.weekend")}</p>
          <p className="mt-3 text-xs text-muted">{t("contact.note")}</p>
        </div>
      </div>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = mailto;
        }}
      >
        <label className="block text-sm">
          <span className="mb-1.5 block text-soft">{t("contact.subject")}</span>
          <select
            className="h-12 w-full rounded-xl border border-line bg-panel px-3"
            value={subject}
            onChange={(e) => setSubject(e.target.value as (typeof SUBJECTS)[number])}
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {t(`contact.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-soft">{t("contact.message")}</span>
          <textarea
            required
            rows={5}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl border border-line bg-panel px-3 py-3"
          />
        </label>
        <p className="text-xs text-muted">{t("contact.mailNote")}</p>
        <button type="submit" className="btn-primary h-12 px-6">
          {t("contact.send")}
        </button>
      </form>
    </article>
  );
}
