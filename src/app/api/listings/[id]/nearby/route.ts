import { NextResponse } from "next/server";
import { publicListingPlace, regionCacheHeader } from "@/lib/listings/publicPlace";
import { nearbyOfKind } from "@/lib/placeGeo";
import { NEARBY_KINDS, type NearbyKind } from "@/lib/regionClient";
import { clientRateKey, rateLimit } from "@/lib/security/rateLimit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const limited = rateLimit(clientRateKey(req, "listing-nearby"), 60, 60_000, req);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "auth.err.rateLimit" }, { status: 429 });
  }

  const kind = new URL(req.url).searchParams.get("kind") as NearbyKind | null;
  if (!kind || !NEARBY_KINDS.includes(kind)) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const result = await publicListingPlace(id);
  if (result === "bad-id") return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  if (result === "not-found") return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });

  const items = result.coords ? await nearbyOfKind(result.coords, kind) : [];
  return NextResponse.json(
    { ok: true, kind, coords: result.coords, items },
    { headers: { "Cache-Control": regionCacheHeader(items.length > 0) } },
  );
}
