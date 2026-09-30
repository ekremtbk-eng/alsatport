"use client";

import Link from "next/link";
import { Bell, MapPin, Search, Tag, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatNotifTime, type NotifKind } from "@/lib/notify";
import { NUMBER_LOCALE } from "@/i18n/config";
import { useEffect, useRef } from "react";
import { useI18n } from "@/context/I18nContext";

const KIND: Record<NotifKind, { icon: typeof Bell; color: string }> = {
  price: { icon: Tag, color: "text-orange" },
  search: { icon: Search, color: "text-lime" },
  nearby: { icon: MapPin, color: "text-blue" },
  system: { icon: Bell, color: "text-soft" },
};

export function NotificationPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useApp();
  const { t, locale } = useI18n();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) {
        const el = e.target as HTMLElement;
        if (el.closest?.("[data-notif-toggle]")) return;
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={box}
      className="absolute end-0 top-[calc(100%+8px)] z-50 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-line bg-panel shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <p className="text-sm font-bold">{t("nav.notifications")}</p>
        <div className="flex items-center gap-2 text-[11px]">
          <button type="button" className="text-lime" onClick={markAllNotificationsRead}>
            {t("notif.readAll")}
          </button>
          <button type="button" className="text-muted" onClick={clearNotifications}>
            {t("notif.clear")}
          </button>
          <button type="button" className="text-muted md:hidden" onClick={onClose} aria-label={t("common.close")}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">{t("notif.empty")}</p>
        ) : (
          notifications.map((n) => {
            const meta = KIND[n.kind];
            const Icon = meta.icon;
            return (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => {
                  markNotificationRead(n.id);
                  onClose();
                }}
                className={`flex gap-3 border-b border-line/70 px-3 py-3 hover:bg-elev ${
                  n.read ? "opacity-70" : ""
                }`}
              >
                <span className={`mt-0.5 ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {n.kind === "system" ? n.title : t(`notif.t.${n.kind}`)}
                    </span>
                    {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />}
                  </span>
                  <span className="mt-0.5 block text-xs text-soft">{n.body}</span>
                  <span className="mt-1 block text-[10px] text-muted">{formatNotifTime(n.createdAt, NUMBER_LOCALE[locale])}</span>
                </span>
              </Link>
            );
          })
        )}
      </div>
      <div className="flex gap-2 border-t border-line p-2">
        <Link href="/bildirimler" onClick={onClose} className="btn-ghost h-9 flex-1 text-xs">
          {t("notif.all")}
        </Link>
        <Link href="/bildirim-ayarlari" onClick={onClose} className="btn-primary h-9 flex-1 text-xs">
          {t("notif.prefs")}
        </Link>
      </div>
    </div>
  );
}
