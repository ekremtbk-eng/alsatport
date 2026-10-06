import { NextResponse, after } from "next/server";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { renewListingRecord } from "@/lib/listings/store";
import { notifyListingEvent } from "@/lib/listings/lifecycle";
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

  const parsed = await readJson(req, idBodySchema);
  if (!parsed.ok) return parsed.response;
  const id = parsed.data.id;

  const renewed = await renewListingRecord(auth.user, id);
  if ("error" in renewed) {
    return NextResponse.json({ ok: false, error: renewed.error }, { status: renewed.status });
  }
  const ref = renewed.ref;
  after(() => notifyListingEvent(ref, "listing.renewed"));

  return NextResponse.json({
    ok: true,
    id,
    expiresAt: renewed.listing.expiresAt,
    postedAt: renewed.listing.postedAt,
    listingStatus: "active" as const,
    listing: renewed.listing,
  });
}
