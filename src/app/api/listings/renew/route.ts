import { NextResponse } from "next/server";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { expiresAtForUser } from "@/lib/listingQuota";
import { entitlementsChanged, reconcileEntitlements } from "@/lib/entitlements";
import { saveUser } from "@/lib/security/userStore";
import { renewListingRecord } from "@/lib/listings/store";
import { readJson } from "@/lib/security/parseBody";
import { idBodySchema } from "@/lib/security/schemas";
import { THROTTLE, throttle, tooMany } from "@/lib/security/throttle";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const limited = await throttle([{ key: `renew:${auth.user.id}`, ...THROTTLE.listing }], req);
  if (!limited.ok) return tooMany(limited.retryAfter);
  const stamped = reconcileEntitlements(auth.user.profile);
  if (entitlementsChanged(auth.user.profile, stamped)) {
    auth.user.profile = stamped;
    await saveUser(auth.user);
  }

  const parsed = await readJson(req, idBodySchema);
  if (!parsed.ok) return parsed.response;
  const id = parsed.data.id;

  const expiresAt = expiresAtForUser(auth.user.profile);
  const renewed = await renewListingRecord(auth.user, id, expiresAt);
  if ("error" in renewed) {
    return NextResponse.json({ ok: false, error: renewed.error }, { status: renewed.status });
  }

  return NextResponse.json({
    ok: true,
    id,
    expiresAt,
    listingStatus: "active" as const,
    listing: renewed.listing,
  });
}
