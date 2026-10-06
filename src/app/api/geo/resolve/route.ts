import { NextResponse } from "next/server";
import { TURKEY_CITIES, districtsOf } from "@/data/turkey";
import { resolveListingCoords } from "@/lib/placeGeo";
import { clientRateKey, rateLimit } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";

export async function GET(req: Request) {
  const limited = rateLimit(clientRateKey(req, "geo-resolve"), 30, 60_000, req);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "auth.err.rateLimit" }, { status: 429 });
  }

  const url = new URL(req.url);
  const city = sanitizeText(url.searchParams.get("city") ?? "", 40);
  const district = sanitizeText(url.searchParams.get("district") ?? "", 40);
  const neighborhood = sanitizeText(url.searchParams.get("neighborhood") ?? "", 40);
  if (!TURKEY_CITIES.some((c) => c.name === city) || (district && !districtsOf(city).includes(district))) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }

  const coords = await resolveListingCoords({ city, district, neighborhood });
  return NextResponse.json(
    { ok: true, coords },
    { headers: { "Cache-Control": coords ? "public, s-maxage=604800" : "public, s-maxage=300" } },
  );
}
