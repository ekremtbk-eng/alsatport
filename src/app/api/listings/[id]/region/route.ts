import { NextResponse } from "next/server";
import { publicListingPlace, regionCacheHeader } from "@/lib/listings/publicPlace";
import { clientRateKey, rateLimit } from "@/lib/security/rateLimit";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const limited = rateLimit(clientRateKey(req, "listing-region"), 40, 60_000, req);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "auth.err.rateLimit" }, { status: 429 });
  }

  const { id } = await ctx.params;
  const result = await publicListingPlace(id);
  if (result === "bad-id") return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  if (result === "not-found") return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });

  return NextResponse.json(
    { ok: true, place: result.place, coords: result.coords },
    { headers: { "Cache-Control": regionCacheHeader(!!result.coords) } },
  );
}
