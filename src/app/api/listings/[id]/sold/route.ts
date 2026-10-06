import { NextResponse, after } from "next/server";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { isUuid } from "@/lib/ids";
import { markListingSold, resaleListingRecord } from "@/lib/listings/store";
import { notifyFavoriters, notifyListingEvent } from "@/lib/listings/lifecycle";
import { readJson } from "@/lib/security/parseBody";
import { listingSaleBodySchema } from "@/lib/security/schemas";
import { THROTTLE, throttle, tooMany } from "@/lib/security/throttle";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const limited = await throttle([{ key: `sold:${auth.user.id}`, ...THROTTLE.listing }], req);
  if (!limited.ok) return tooMany(limited.retryAfter);

  const parsed = await readJson(req, listingSaleBodySchema);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.action === "sold") {
    const sold = await markListingSold(auth.user, id);
    if ("error" in sold) return NextResponse.json({ ok: false, error: sold.error }, { status: sold.status });
    const { ref, wasLive } = sold;
    after(async () => {
      await notifyListingEvent(ref, "listing.sold");
      if (wasLive) await notifyFavoriters(ref, "favorite.sold");
    });
    return NextResponse.json({ ok: true, listing: sold.listing });
  }

  const resale = await resaleListingRecord(auth.user, id);
  if ("error" in resale) return NextResponse.json({ ok: false, error: resale.error }, { status: resale.status });
  const ref = resale.ref;
  after(() => notifyListingEvent(ref, "listing.resale"));
  return NextResponse.json({ ok: true, listing: resale.listing });
}
