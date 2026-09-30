import { NextResponse } from "next/server";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { expiresAtForUser } from "@/lib/listingQuota";
import { entitlementsChanged, reconcileEntitlements } from "@/lib/entitlements";
import { saveUser } from "@/lib/security/userStore";
import { renewListingRecord } from "@/lib/listings/store";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const stamped = reconcileEntitlements(auth.user.profile);
  if (entitlementsChanged(auth.user.profile, stamped)) {
    auth.user.profile = stamped;
    await saveUser(auth.user);
  }

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }

  const expiresAt = expiresAtForUser(auth.user.profile);
  const renewed = await renewListingRecord(auth.user, body.id, expiresAt);
  if ("error" in renewed) {
    return NextResponse.json({ ok: false, error: renewed.error }, { status: renewed.status });
  }

  return NextResponse.json({
    ok: true,
    id: body.id,
    expiresAt,
    listingStatus: "active" as const,
    listing: renewed.listing,
  });
}
