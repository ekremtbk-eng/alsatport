/** Per-event notification preferences stored in profiles.notification_prefs (sparse JSON, merged with defaults). */

export const NOTIF_EVENTS = [
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
  "message.new",
  "favorite.sold",
  "favorite.gone",
  "security.newDevice",
  "security.password",
  "security.recovery",
  "security.twoFactor",
  "security.email",
] as const;

export type NotifEvent = (typeof NOTIF_EVENTS)[number];
export type ChannelPref = { inApp: boolean; email: boolean };
export type NotificationPrefs = Record<NotifEvent, ChannelPref>;

const ON = { inApp: true, email: false };

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  "listing.published": ON,
  "listing.rejected": ON,
  "listing.removed": ON,
  "listing.updated": { inApp: false, email: false },
  "listing.expiring3d": ON,
  "listing.expiring1d": ON,
  "listing.expired": ON,
  "listing.deactivated": { inApp: false, email: false },
  "listing.renewed": ON,
  "listing.sold": ON,
  "listing.resale": ON,
  "listing.message": ON,
  "message.new": ON,
  "favorite.sold": ON,
  "favorite.gone": ON,
  "security.newDevice": ON,
  "security.password": ON,
  "security.recovery": ON,
  "security.twoFactor": ON,
  "security.email": ON,
};

/** Security e-mails are sent regardless of preferences; only the in-app copy can be muted. */
export function isMandatoryEmail(event: NotifEvent) {
  return event.startsWith("security.");
}

/** Events offered on the one-time card shown right after a listing is published. */
export const PUBLISH_CARD_EVENTS: NotifEvent[] = [
  "listing.expiring3d",
  "listing.expiring1d",
  "listing.expired",
  "listing.message",
  "listing.renewed",
];

export function isNotifEvent(value: string): value is NotifEvent {
  return (NOTIF_EVENTS as readonly string[]).includes(value);
}

export function mergeNotificationPrefs(raw: unknown): NotificationPrefs {
  const out = { ...DEFAULT_NOTIFICATION_PREFS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isNotifEvent(key) || !value || typeof value !== "object") continue;
    const v = value as Partial<ChannelPref>;
    out[key] = {
      inApp: typeof v.inApp === "boolean" ? v.inApp : out[key].inApp,
      email: isMandatoryEmail(key) ? true : typeof v.email === "boolean" ? v.email : out[key].email,
    };
  }
  for (const key of NOTIF_EVENTS) if (isMandatoryEmail(key)) out[key] = { ...out[key], email: true };
  return out;
}
