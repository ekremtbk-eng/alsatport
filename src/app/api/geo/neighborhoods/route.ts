import { NextResponse } from "next/server";
import { neighborhoodsOf } from "@/lib/geo/neighborhoods";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const city = (url.searchParams.get("city") ?? "").slice(0, 80);
  const district = (url.searchParams.get("district") ?? "").slice(0, 80);
  const neighborhoods = neighborhoodsOf(city, district);
  return NextResponse.json(
    { ok: true, neighborhoods },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
