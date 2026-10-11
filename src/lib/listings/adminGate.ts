import "server-only";
import { NextResponse } from "next/server";
import type { UserSession } from "@prisma/client";
import { prisma } from "@/lib/db";
import { stepUpError } from "@/lib/security/session";
import type { StoredUser } from "@/lib/security/userStore";

/**
 * Owner routes also let an admin act on any listing. Acting on someone else's listing needs the same
 * second factor and fresh step-up as the admin API, so a stolen admin password or cookie alone is not enough.
 */
export async function adminActingGate(auth: { user: StoredUser; session: UserSession }, listingId: string) {
  if (auth.user.role !== "admin") return null;
  const row = await prisma.listing.findUnique({ where: { id: listingId }, select: { sellerId: true } });
  if (!row || row.sellerId === auth.user.id) return null;
  if (!auth.session.mfaAt) return NextResponse.json({ ok: false, error: "auth.err.adminMfa" }, { status: 403 });
  return stepUpError(auth.session);
}
