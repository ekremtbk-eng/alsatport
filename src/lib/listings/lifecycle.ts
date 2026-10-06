import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LISTING_LIVE_DAYS } from "@/lib/campaign";
import { DAY_MS, calendarDaysLeft } from "@/lib/listingQuota";
import { notifySafe } from "@/lib/notifications/store";
import type { NotifEvent } from "@/lib/notifications/prefs";

/** Visible to the public: active AND inside its period. A late cron can never leak an expired listing. */
export function liveListingWhere(now = new Date()): Prisma.ListingWhereInput {
  return { status: "active", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

export function isLiveRow(row: { status: string; expiresAt: Date | null; deletedAt?: Date | null }, now = Date.now()) {
  return row.status === "active" && !row.deletedAt && (!row.expiresAt || row.expiresAt.getTime() > now);
}

export function newPeriod(now = new Date()) {
  return { postedAt: now, expiresAt: new Date(now.getTime() + LISTING_LIVE_DAYS * DAY_MS) };
}

const MY_LISTINGS = "/profil?p=ilanlarim";

export type ListingRef = { id: string; title: string; sellerId: string; expiresAt: Date | null };

function quoted(title: string) {
  return `“${title.slice(0, 80)}”`;
}

/** Period-scoped keys: a republished listing gets a new expires_at, so its reminders can fire again. */
function periodKey(l: ListingRef) {
  return l.expiresAt ? String(l.expiresAt.getTime()) : "none";
}

const TEXT: Record<
  Exclude<NotifEvent, `security.${string}` | "message.new" | "favorite.sold" | "favorite.gone">,
  (l: ListingRef, extra?: string) => { title: string; body: string }
> = {
  "listing.published": (l) => ({
    title: "İlanınız yayında",
    body: `${quoted(l.title)} ilanınız yayına alındı. Yayın süresi ${LISTING_LIVE_DAYS} gün.`,
  }),
  "listing.rejected": (l, reason) => ({
    title: "İlanınız reddedildi",
    body: `${quoted(l.title)} ilanınız yayın kurallarına uygun bulunmadı.${reason ? ` Gerekçe: ${reason}` : ""}`,
  }),
  "listing.removed": (l) => ({
    title: "İlanınız kaldırıldı",
    body: `${quoted(l.title)} ilanınız yönetici tarafından yayından kaldırıldı.`,
  }),
  "listing.updated": (l) => ({
    title: "İlanınız güncellendi",
    body: `${quoted(l.title)} ilanınızın bilgileri güncellendi.`,
  }),
  "listing.expiring3d": (l, days) => ({
    title: "İlan süreniz bitiyor",
    body: `İlanınızın yayın süresinin bitmesine ${days ?? "3"} gün kaldı. (${quoted(l.title)})`,
  }),
  "listing.expiring1d": (l, when) => ({
    title: when === "today" ? "İlanınız bugün yayından kalkacak" : "İlanınız yarın yayından kalkacak",
    body: `${when === "today" ? "İlanınız bugün yayından kalkacak." : "İlanınız yarın yayından kalkacak."} (${quoted(l.title)})`,
  }),
  "listing.expired": (l) => ({
    title: "İlan süreniz doldu",
    body: `İlanınızın ${LISTING_LIVE_DAYS} günlük yayın süresi sona erdi. Ücretsiz olarak yeniden yayınlayabilirsiniz. (${quoted(l.title)})`,
  }),
  "listing.deactivated": (l) => ({
    title: "İlanınız pasife alındı",
    body: `Süresi dolan ilanınız pasife alındı ve artık ziyaretçilere gösterilmiyor. (${quoted(l.title)})`,
  }),
  "listing.renewed": (l) => ({
    title: "İlanınız yeniden yayında",
    body: `İlanınız yeniden yayına alındı ve yeni ${LISTING_LIVE_DAYS} günlük yayın süresi başladı. (${quoted(l.title)})`,
  }),
  "listing.sold": (l) => ({
    title: "İlanınız satıldı olarak işaretlendi",
    body: `${quoted(l.title)} ilanınız satıldı olarak işaretlendi ve yayından kaldırıldı.`,
  }),
  "listing.resale": (l) => ({
    title: "İlanınız yeniden satışta",
    body: `İlanınız yeniden satışa çıkarıldı ve yeni ${LISTING_LIVE_DAYS} günlük yayın süresi başladı. (${quoted(l.title)})`,
  }),
  "listing.message": (l) => ({
    title: "İlanınıza yeni mesaj",
    body: `${quoted(l.title)} ilanınız için yeni bir mesajınız var.`,
  }),
};

export type SellerListingEvent = keyof typeof TEXT;

/** One-shot seller notices; `unique` distinguishes repeatable events (edits) inside the same period. */
export async function notifyListingEvent(l: ListingRef, event: SellerListingEvent, opts: { extra?: string; unique?: string } = {}) {
  const text = TEXT[event](l, opts.extra);
  const href = event === "listing.published" || event === "listing.renewed" || event === "listing.resale" ? `/ilan/${l.id}` : MY_LISTINGS;
  return notifySafe({
    userId: l.sellerId,
    event,
    ...text,
    href,
    listingId: l.id,
    eventKey: `listing:${l.id}:${periodKey(l)}:${event}${opts.unique ? `:${opts.unique}` : ""}`,
  });
}

/** Tells users who saved the listing that it is no longer available. */
export async function notifyFavoriters(l: ListingRef, event: "favorite.sold" | "favorite.gone") {
  const fans = await prisma.favorite.findMany({
    where: { listingId: l.id, userId: { not: l.sellerId } },
    select: { userId: true },
    take: 500,
  });
  const text =
    event === "favorite.sold"
      ? { title: "Favori ilanınız satıldı", body: `Favorilerinizdeki ${quoted(l.title)} ilanı satıldı.` }
      : { title: "Favori ilanınız yayından kalktı", body: `Favorilerinizdeki ${quoted(l.title)} ilanı artık yayında değil.` };
  for (const f of fans) {
    await notifySafe({
      userId: f.userId,
      event,
      ...text,
      href: "/profil?p=fav-ilan",
      listingId: l.id,
      eventKey: `fav:${l.id}:${f.userId}:${periodKey(l)}:${event}`,
    });
  }
}

const listingRefSelect = { id: true, title: true, sellerId: true, expiresAt: true } as const;

export type SweepResult = { expired: number; reminders: number };

/**
 * Moves due listings to `expired` and sends 3-day / 1-day reminders. Safe to run any number of times:
 * the status update is conditional and every notice is keyed to the listing's current period.
 */
export async function sweepListings(opts: { sellerId?: string; now?: Date; batch?: number } = {}): Promise<SweepResult> {
  const now = opts.now ?? new Date();
  const batch = opts.batch ?? 300;
  const scope: Prisma.ListingWhereInput = opts.sellerId ? { sellerId: opts.sellerId } : {};
  let expired = 0;
  let reminders = 0;

  for (let round = 0; round < 10; round++) {
    const due = await prisma.listing.findMany({
      where: { ...scope, deletedAt: null, status: "active", expiresAt: { lte: now } },
      select: listingRefSelect,
      orderBy: { expiresAt: "asc" },
      take: batch,
    });
    for (const l of due) {
      const moved = await prisma.listing.updateMany({
        where: { id: l.id, status: "active", expiresAt: { lte: now } },
        data: { status: "expired" },
      });
      if (!moved.count) continue;
      expired++;
      await notifyListingEvent(l, "listing.expired");
      await notifyListingEvent(l, "listing.deactivated");
      await notifyFavoriters(l, "favorite.gone");
    }
    if (due.length < batch) break;
  }

  const soon = await prisma.listing.findMany({
    where: {
      ...scope,
      deletedAt: null,
      status: "active",
      expiresAt: { gt: now, lte: new Date(now.getTime() + 4 * DAY_MS) },
    },
    select: listingRefSelect,
    take: batch * 10,
  });
  for (const l of soon) {
    const days = calendarDaysLeft(l.expiresAt!.getTime(), now.getTime());
    if (days > 3 || days < 0) continue;
    const r =
      days <= 1
        ? await notifyListingEvent(l, "listing.expiring1d", { extra: days === 0 ? "today" : "tomorrow" })
        : await notifyListingEvent(l, "listing.expiring3d", { extra: String(days) });
    if (r === "sent") reminders++;
  }
  return { expired, reminders };
}
