"use client";

import { useCallback, useEffect, useState } from "react";
import { SearchSelect } from "@/components/SearchSelect";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";
import { TURKEY_CITIES } from "@/data/turkey";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type ChannelPref,
  type NotifEvent,
  type NotificationPrefs,
  isMandatoryEmail,
} from "@/lib/notifications/prefs";
import { isEmailVerified } from "@/lib/profile";
import { apiGet, apiPatch } from "@/lib/security/client";
import { useServerSetting } from "./AccountPanels";
import { Notice, Pane } from "./DashUi";

const LISTING_ROWS: NotifEvent[] = [
  "listing.published",
  "listing.rejected",
  "listing.removed",
  "listing.updated",
  "listing.expiring3d",
  "listing.expiring1d",
  "listing.expired",
  "listing.deactivated",
  "listing.renewed",
  "listing.sold",
  "listing.resale",
  "listing.message",
];
const WITH_DESC = new Set<NotifEvent>(["listing.expired", "listing.deactivated", "favorite.gone", "security.newDevice"]);
const SECURITY_ROWS: NotifEvent[] = [
  "security.newDevice",
  "security.password",
  "security.recovery",
  "security.twoFactor",
  "security.email",
];

function Switch({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full disabled:opacity-60 ${on ? "bg-lime" : "bg-elev"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "start-[1.375rem]" : "start-0.5"}`} />
    </button>
  );
}

/** Label + up to two channel switches; stacks on phones, aligns into two columns from `sm` up. */
function ChannelRow({
  title,
  desc,
  inApp,
  email,
}: {
  title: string;
  desc?: string;
  inApp?: { on: boolean; disabled?: boolean; onChange: (v: boolean) => void };
  email?: { on: boolean; disabled?: boolean; onChange: (v: boolean) => void; note?: string } | { note: string };
}) {
  const { t } = useI18n();
  return (
    <div className="notif-row">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {desc ? <p className="text-xs text-muted">{desc}</p> : null}
      </div>
      <div className="notif-cell">
        <span className="notif-cell-label">{t("np.col.inApp")}</span>
        {inApp ? (
          <Switch on={inApp.on} disabled={inApp.disabled} label={`${title} · ${t("np.col.inApp")}`} onChange={inApp.onChange} />
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </div>
      <div className="notif-cell">
        <span className="notif-cell-label">{t("np.col.email")}</span>
        {email && "onChange" in email ? (
          <Switch on={email.on} disabled={email.disabled} label={`${title} · ${t("np.col.email")}`} onChange={email.onChange} />
        ) : email ? (
          <span className="notif-forced">{email.note}</span>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </div>
    </div>
  );
}

function Section({ title, desc, columns = true, children }: { title: string; desc?: string; columns?: boolean; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="notif-section">
      <div className="notif-head">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-ink">{title}</h2>
          {desc ? <p className="text-xs text-muted">{desc}</p> : null}
        </div>
        {columns ? (
          <>
            <span className="notif-col">{t("np.col.inApp")}</span>
            <span className="notif-col">{t("np.col.email")}</span>
          </>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void apiGet<{ ok?: boolean; prefs?: NotificationPrefs }>("/api/account/notification-prefs").then((res) => {
      if (cancelled) return;
      if (res.ok && res.prefs) setPrefs(res.prefs);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const save = useCallback(async (patch: Partial<Record<NotifEvent, Partial<ChannelPref>>>) => {
    setError("");
    setPrefs((p) => {
      const next = { ...p };
      for (const [k, v] of Object.entries(patch) as [NotifEvent, Partial<ChannelPref>][]) next[k] = { ...next[k], ...v };
      return next;
    });
    const res = await apiPatch<{ ok?: boolean; error?: string; prefs?: NotificationPrefs }>("/api/account/notification-prefs", {
      prefs: patch,
    });
    if (res.ok && res.prefs) setPrefs(res.prefs);
    else setError(res.error ?? "auth.err.server");
    return !!res.ok;
  }, []);
  return { prefs, loaded, error, save };
}

export function NotificationSettingsPanel() {
  const { user, notifPrefs, setNotifPrefs, geo, requestLocation, setGeoCity } = useApp();
  const { t } = useI18n();
  const { prefs, loaded, error, save } = useNotificationPrefs();
  const account = useServerSetting();
  if (!user) return null;
  const emailOk = isEmailVerified(user);
  const forced = t("np.forced");

  const row = (event: NotifEvent) => (
    <ChannelRow
      key={event}
      title={t(`np.ev.${event}`)}
      desc={WITH_DESC.has(event) ? t(`np.ev.${event}.d`) : undefined}
      inApp={{ on: prefs[event].inApp, disabled: !loaded, onChange: (v) => void save({ [event]: { inApp: v } }) }}
      email={
        isMandatoryEmail(event)
          ? { note: forced }
          : { on: prefs[event].email, disabled: !loaded || !emailOk, onChange: (v) => void save({ [event]: { email: v } }) }
      }
    />
  );

  return (
    <Pane title={t("dash.app.notif")}>
      <p className="mb-2 text-sm text-muted">{t("np.intro")}</p>
      {!emailOk ? <p className="mb-2 text-xs font-semibold text-orange">{t("np.emailUnverified")}</p> : null}
      <Notice error={error ? t(error) : ""} />

      <Section title={t("np.sec.listing")} desc={t("np.sec.listing.d")}>
        {LISTING_ROWS.map(row)}
      </Section>

      <Section title={t("np.sec.message")}>{row("message.new")}</Section>

      <Section title={t("np.sec.fav")} desc={t("np.sec.fav.d")}>
        {row("favorite.sold")}
        {row("favorite.gone")}
        <ChannelRow
          title={t("notif.p1")}
          desc={t("notif.p1d")}
          inApp={{ on: notifPrefs.priceDrop, onChange: (v) => setNotifPrefs({ priceDrop: v }) }}
        />
        <ChannelRow
          title={t("notif.p2")}
          desc={t("notif.p2d")}
          inApp={{ on: notifPrefs.savedSearch, onChange: (v) => setNotifPrefs({ savedSearch: v }) }}
        />
        <ChannelRow
          title={t("notif.p3")}
          desc={t("notif.p3d")}
          inApp={{ on: notifPrefs.nearby, onChange: (v) => setNotifPrefs({ nearby: v }) }}
        />
        {notifPrefs.nearby ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <button type="button" className="btn-primary h-10 px-4 text-sm" onClick={requestLocation}>
              {t("loc.allow")}
            </button>
            <div className="min-w-0 flex-1">
              <SearchSelect
                label={t("notif.city")}
                value={geo.city ?? ""}
                options={TURKEY_CITIES.map((c) => c.name)}
                placeholder={t("notif.city")}
                onChange={setGeoCity}
              />
            </div>
          </div>
        ) : null}
      </Section>

      <Section title={t("np.sec.security")} desc={t("np.sec.security.d")}>
        {SECURITY_ROWS.map(row)}
        <ChannelRow title={t("np.ev.security.suspended")} email={{ note: forced }} />
      </Section>

      <Section title={t("np.sec.marketing")} desc={t("dash.mkt.p")} columns={false}>
        <SimpleToggle
          title={t("dash.mkt.email")}
          on={!!user.marketingEmail}
          disabled={account.busy}
          onChange={(v) => void account.save({ marketingEmail: v })}
        />
        <SimpleToggle
          title={t("dash.mkt.sms")}
          on={!!user.marketingSms}
          disabled={account.busy}
          onChange={(v) => void account.save({ marketingSms: v })}
        />
        <SimpleToggle
          title={t("dash.mkt.push")}
          on={!!user.marketingPush}
          disabled={account.busy}
          onChange={(v) => void account.save({ marketingPush: v })}
        />
      </Section>

      <Section title={t("dash.app.read")} columns={false}>
        <SimpleToggle
          title={t("dash.read.on")}
          desc={t("dash.read.d")}
          on={user.readReceipts !== false}
          disabled={account.busy}
          onChange={(v) => void account.save({ readReceipts: v })}
        />
      </Section>
      <Notice error={account.error ? t(account.error) : ""} />
    </Pane>
  );
}

function SimpleToggle({
  title,
  desc,
  on,
  disabled,
  onChange,
}: {
  title: string;
  desc?: string;
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="notif-row notif-row-simple">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {desc ? <p className="text-xs text-muted">{desc}</p> : null}
      </div>
      <Switch on={on} disabled={disabled} label={title} onChange={onChange} />
    </div>
  );
}
