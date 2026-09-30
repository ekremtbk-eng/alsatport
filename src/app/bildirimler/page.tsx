"use client";

import Link from "next/link";
import { Bell, MapPin, Search, Tag } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatNotifTime, type NotifKind } from "@/lib/notify";
import { useI18n } from "@/context/I18nContext";
import { NUMBER_LOCALE } from "@/i18n/config";

const KIND: Record<NotifKind, { icon: typeof Bell; key: string }> = {
  price: { icon: Tag, key: "notif.kind.price" },
  search: { icon: Search, key: "notif.kind.search" },
  nearby: { icon: MapPin, key: "notif.kind.nearby" },
  system: { icon: Bell, key: "notif.kind.system" },
};

function titleFor(kind: NotifKind, fallback: string, t: (k: string) => string) {
  const key = `notif.t.${kind}`;
  const v = t(key);
  return v === key ? fallback : v;
}

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead, clearNotifications } =
    useApp();
  const { t, locale } = useI18n();

  return (
    <div className="mx-auto max-w-2xl px-3 py-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{t("notif.h")}</h1>
        <Link href="/bildirim-ayarlari" className="text-sm font-semibold text-lime">
          {t("notif.prefs")}
        </Link>
      </div>
      <div className="mb-3 flex gap-2">
        <button type="button" className="chip" onClick={markAllNotificationsRead}>
          {t("notif.read")}
        </button>
        <button type="button" className="chip" onClick={clearNotifications}>
          {t("notif.clear")}
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card p-8 text-center text-muted">
          {t("notif.boxEmpty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const meta = KIND[n.kind];
            const Icon = meta.icon;
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => markNotificationRead(n.id)}
                  className={`flex gap-3 rounded-2xl border border-line bg-card p-3 ${
                    n.read ? "opacity-70" : "ring-1 ring-lime/25"
                  }`}
                >
                  <span className="icon-tile grid h-10 w-10 place-items-center rounded-xl text-lime">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2">
                      <span className="font-semibold">{titleFor(n.kind, n.title, t)}</span>
                      <span className="text-[10px] text-muted">{formatNotifTime(n.createdAt, NUMBER_LOCALE[locale])}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-soft">{n.body}</span>
                    <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted">
                      {t(meta.key)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
