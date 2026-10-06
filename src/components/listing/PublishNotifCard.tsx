"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { PUBLISH_CARD_EVENTS, type ChannelPref, type NotifEvent } from "@/lib/notifications/prefs";
import { useNotificationPrefs } from "@/components/dashboard/NotificationSettings";

const SEEN_PREFIX = "ap:pubcard:";
export const PUBLISHED_PARAM = "yayinlandi";

/**
 * Asked once per listing, right after it goes live. Showing it is enough to mark it as seen, so a
 * reload or a second visit never brings it back. Only in-app channels are touched; e-mail stays as
 * the user configured it in notification settings.
 */
export function PublishNotifCard({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(PUBLISHED_PARAM) !== "1") return;
    url.searchParams.delete(PUBLISHED_PARAM);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    const key = `${SEEN_PREFIX}${listingId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      /* private mode: still show once for this page view */
    }
    setOpen(true);
  }, [listingId]);

  if (!open) return null;
  return <CardBody onClose={() => setOpen(false)} />;
}

function CardBody({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { prefs, loaded, save } = useNotificationPrefs();
  const [picked, setPicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PUBLISH_CARD_EVENTS.map((e) => [e, true])),
  );
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function enable() {
    setSaving(true);
    const patch: Partial<Record<NotifEvent, Partial<ChannelPref>>> = {};
    for (const e of PUBLISH_CARD_EVENTS) patch[e] = { inApp: !!picked[e] };
    const ok = await save(patch);
    setSaving(false);
    if (ok) {
      setDone(true);
      window.setTimeout(onClose, 1800);
    }
  }

  return (
    <section
      role="dialog"
      aria-labelledby="pubcard-title"
      className="relative mx-4 mt-3 rounded-2xl border border-lime/40 bg-card p-4 shadow-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t("pubcard.close")}
        className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-elev"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pe-8">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-lime" strokeWidth={2} />
        <div className="min-w-0">
          <h2 id="pubcard-title" className="text-sm font-extrabold text-ink">
            {t("pubcard.title")}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{t("pubcard.desc")}</p>
        </div>
      </div>
      {done ? (
        <p role="status" className="mt-3 text-sm font-semibold text-lime">
          {t("pubcard.saved")}
        </p>
      ) : (
        <>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {PUBLISH_CARD_EVENTS.map((e) => (
              <li key={e}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-lime"
                    checked={!!picked[e]}
                    onChange={(ev) => setPicked((p) => ({ ...p, [e]: ev.target.checked }))}
                  />
                  <span>{t(`pubcard.ev.${e}`)}</span>
                </label>
              </li>
            ))}
          </ul>
          {loaded && PUBLISH_CARD_EVENTS.some((e) => prefs[e].email) ? (
            <p className="mt-2 text-[11px] text-muted">{t("pubcard.emailNote")}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={saving || !loaded} onClick={() => void enable()} className="btn-primary h-10 px-4 text-sm">
              {t("pubcard.enable")}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost h-10 px-4 text-sm">
              {t("pubcard.later")}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
