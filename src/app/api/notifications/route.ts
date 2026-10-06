import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { DAY_MS } from "@/lib/listingQuota";
import { sweepListings } from "@/lib/listings/lifecycle";
import { clearInbox, listInbox, markInboxRead } from "@/lib/notifications/store";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { notificationsActionSchema } from "@/lib/security/schemas";

const SWEEP_EVERY_MS = 10 * 60 * 1000;
const lastSweep = new Map<string, number>();

/**
 * The daily cron is the source of truth; this per-seller pass only makes expiry and reminders show up
 * promptly when the seller is online. Gated per instance so 10s polling never turns into DB churn.
 */
async function lazySweep(userId: string) {
  const now = Date.now();
  if (now - (lastSweep.get(userId) ?? 0) < SWEEP_EVERY_MS) return;
  lastSweep.set(userId, now);
  if (lastSweep.size > 5000) lastSweep.clear();
  const due = await prisma.listing.findFirst({
    where: { sellerId: userId, deletedAt: null, status: "active", expiresAt: { lte: new Date(now + 4 * DAY_MS) } },
    select: { id: true },
  });
  if (due) await sweepListings({ sellerId: userId });
}

export async function GET() {
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const userId = auth.user.id;
  after(() => lazySweep(userId).catch(() => undefined));
  const notifications = await listInbox(userId);
  return NextResponse.json({ ok: true, notifications }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const parsed = await readJson(req, notificationsActionSchema);
  if (!parsed.ok) return parsed.response;
  const { action, ids } = parsed.data;
  if (action === "clear") await clearInbox(auth.user.id);
  else await markInboxRead(auth.user.id, action === "readAll" ? "all" : (ids ?? []));
  return NextResponse.json({ ok: true });
}
