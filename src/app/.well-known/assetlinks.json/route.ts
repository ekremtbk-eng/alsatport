import { NextResponse } from "next/server";
import { assetLinks } from "@/data/androidApp";

export const dynamic = "force-static";

export function GET() {
  const body = assetLinks();
  if (!body) return new NextResponse("Not Found", { status: 404 });
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
