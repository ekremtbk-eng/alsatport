import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { sendNoticeEmail } from "@/lib/mail/authMail";
import {
  type ChannelPref,
  type NotifEvent,
  type NotificationPrefs,
  isMandatoryEmail,
  isNotifEvent,
  mergeNotificationPrefs,
} from "@/lib/notifications/prefs";

export type NotifyInput = {
  userId: string;
  event: NotifEvent;
  title: string;
  body: string;
  href?: string;
  listingId?: string | null;
  /** Unique per logical event; a second call with the same key is a no-op. */
  eventKey: string;
};

export type ServerNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  createdAt: number;
  read: boolean;
  listingId?: string;
};

type Recipient = { email: string; emailVerifiedAt: Date | null; bannedAt: Date | null; prefs: NotificationPrefs };

async function loadRecipient(userId: string): Promise<Recipient | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerifiedAt: true, bannedAt: true, profile: { select: { notificationPrefs: true } } },
  });
  if (!row) return null;
  return {
    email: row.email,
    emailVerifiedAt: row.emailVerifiedAt,
    bannedAt: row.bannedAt,
    prefs: mergeNotificationPrefs(row.profile?.notificationPrefs),
  };
}

/**
 * Records the event once (event_key is unique) and delivers it on the channels the user enabled.
 * Security events never send e-mail from here; their mandatory mail is sent by the security flow itself.
 */
export async function notify(input: NotifyInput, recipient?: Recipient | null): Promise<"sent" | "duplicate" | "skipped"> {
  const who = recipient === undefined ? await loadRecipient(input.userId) : recipient;
  if (!who || who.bannedAt) return "skipped";
  const pref: ChannelPref = who.prefs[input.event];
  const wantsEmail = !isMandatoryEmail(input.event) && pref.email && !!who.emailVerifiedAt && !!who.email;
  if (!pref.inApp && !wantsEmail) return "skipped";
  const eventKey = input.eventKey.slice(0, 200);
  // ON CONFLICT DO NOTHING: re-running the cron is routine, so a duplicate is not an error worth logging.
  const inserted = await prisma.notification.createMany({
    data: [
      {
        userId: input.userId,
        listingId: input.listingId ?? null,
        kind: input.event,
        title: input.title.slice(0, 160),
        body: input.body.slice(0, 600),
        href: (input.href ?? "").slice(0, 300),
        eventKey,
        inApp: pref.inApp,
      },
    ],
    skipDuplicates: true,
  });
  if (!inserted.count) return "duplicate";
  if (wantsEmail) {
    const sent = await sendNoticeEmail(who.email, input.title, input.body, input.href ?? "/profil").catch(() => null);
    if (sent?.ok) {
      await prisma.notification.update({ where: { eventKey }, data: { emailedAt: new Date() } }).catch(() => undefined);
    }
  }
  return "sent";
}

/** Same as notify(), but never lets a delivery problem break the user action that triggered it. */
export async function notifySafe(input: NotifyInput) {
  try {
    return await notify(input);
  } catch (err) {
    console.error("[notify] failed", input.event, err instanceof Error ? err.message : err);
    return "skipped" as const;
  }
}

export async function listInbox(userId: string, take = 50): Promise<ServerNotification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId, inApp: true },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((r) => ({
    id: `srv:${r.id}`,
    kind: r.kind,
    title: r.title,
    body: r.body,
    href: r.href,
    createdAt: r.createdAt.getTime(),
    read: !!r.readAt,
    listingId: r.listingId ?? undefined,
  }));
}

export async function markInboxRead(userId: string, ids: string[] | "all") {
  const now = new Date();
  if (ids === "all") {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: now } });
    return;
  }
  const clean = ids.map((id) => id.replace(/^srv:/, "")).filter(isUuid).slice(0, 100);
  if (!clean.length) return;
  await prisma.notification.updateMany({ where: { userId, id: { in: clean }, readAt: null }, data: { readAt: now } });
}

export async function clearInbox(userId: string) {
  await prisma.notification.updateMany({ where: { userId, inApp: true }, data: { inApp: false, readAt: new Date() } });
}

export async function loadNotificationPrefs(userId: string) {
  const row = await prisma.profile.findUnique({ where: { userId }, select: { notificationPrefs: true } });
  return mergeNotificationPrefs(row?.notificationPrefs);
}

export async function updateNotificationPrefs(userId: string, patch: Record<string, Partial<ChannelPref>>) {
  const current = await loadNotificationPrefs(userId);
  for (const [key, value] of Object.entries(patch)) {
    if (!isNotifEvent(key)) continue;
    current[key] = {
      inApp: typeof value.inApp === "boolean" ? value.inApp : current[key].inApp,
      email: isMandatoryEmail(key) ? true : typeof value.email === "boolean" ? value.email : current[key].email,
    };
  }
  await prisma.profile.updateMany({
    where: { userId },
    data: { notificationPrefs: current as unknown as Prisma.InputJsonValue },
  });
  return current;
}
