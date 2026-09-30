"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/context/I18nContext";

export function NotificationToasts() {
  const { notifications } = useApp();
  const { t } = useI18n();
  const shownRef = useRef<Set<string>>(new Set());
  const [toast, setToast] = useState<(typeof notifications)[number] | null>(null);

  useEffect(() => {
    const latest = notifications[0];
    if (!latest || shownRef.current.has(latest.id)) return;
    shownRef.current.add(latest.id);
    if (Date.now() - latest.createdAt > 12_000) return;
    setToast(latest);
  }, [notifications]);

  if (!toast) return null;

  const hide = () => setToast(null);

  return (
    <div className="toast-alert" role="status">
      <Bell className="h-4 w-4 shrink-0 text-lime" />
      <Link href={toast.href} className="min-w-0 flex-1" onClick={hide}>
        <span className="block text-sm font-bold">
          {toast.kind === "system" ? toast.title : t(`notif.t.${toast.kind}`)}
        </span>
        <span className="block truncate text-xs text-soft">{toast.body}</span>
      </Link>
      <button type="button" className="loc-banner-x shrink-0" onClick={hide} aria-label={t("common.close")}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
