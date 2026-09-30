"use client";

import { useState } from "react";
import {
  LEGAL_COMPANY,
  LEGAL_EMAIL_KVKK,
  LEGAL_KEP,
} from "@/data/legal";
import { useI18n } from "@/context/I18nContext";
import { SupportMailLink } from "@/components/SupportMailLink";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const { t } = useI18n();

  return (
    <article>
      <p className="text-xs font-semibold uppercase tracking-wider text-lime">{t("contact.kicker")}</p>
      <h2 className="mt-1 text-2xl font-extrabold">{t("contact.h")}</h2>
      <p className="mt-3 text-sm leading-relaxed text-soft">{t("contact.p")}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-4 text-sm">
          <p className="font-extrabold">{LEGAL_COMPANY}</p>
          <div className="mt-3">
            <SupportMailLink variant="card" />
          </div>
          <p>
            KVKK:{" "}
            <a className="text-lime" href={`mailto:${LEGAL_EMAIL_KVKK}`}>
              {LEGAL_EMAIL_KVKK}
            </a>
          </p>
          <p className="mt-1 text-muted">KEP: {LEGAL_KEP}</p>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-4 text-sm text-soft">
          <p className="font-extrabold text-ink">{t("contact.hours")}</p>
          <p className="mt-2">{t("contact.week")}</p>
          <p>{t("contact.weekend")}</p>
          <p className="mt-3 text-xs text-muted">
            {t("contact.note")}
          </p>
        </div>
      </div>

      {sent ? (
        <p className="mt-6 rounded-2xl border border-lime/30 bg-lime/10 p-4 text-sm font-semibold text-lime">
            {t("contact.sent")}
        </p>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <label className="block text-sm">
            <span className="mb-1.5 block text-soft">{t("contact.name")}</span>
            <input required className="h-12 w-full rounded-xl border border-line bg-panel px-3" />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-soft">{t("contact.email")}</span>
            <input
              required
              type="email"
              className="h-12 w-full rounded-xl border border-line bg-panel px-3"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-soft">{t("contact.subject")}</span>
            <select className="h-12 w-full rounded-xl border border-line bg-panel px-3" defaultValue="genel">
              <option value="genel">{t("contact.genel")}</option>
              <option value="basin">{t("contact.basin")}</option>
              <option value="is">{t("contact.is")}</option>
              <option value="ik">{t("contact.ik")}</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-soft">{t("contact.message")}</span>
            <textarea required rows={5} className="w-full rounded-xl border border-line bg-panel px-3 py-3" />
          </label>
          <button type="submit" className="btn-primary h-12 px-6">
            {t("contact.send")}
          </button>
        </form>
      )}
    </article>
  );
}
