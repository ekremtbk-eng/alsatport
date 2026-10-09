import { NextResponse } from "next/server";
import { getCategoryCounts } from "@/lib/listings/categoryCounts";

export const dynamic = "force-dynamic";

/** Live listing counts for every category and subcategory in one response. */
export async function GET() {
  try {
    const { counts, total, at } = await getCategoryCounts();
    return NextResponse.json(
      { ok: true, counts, total, at },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "auth.err.server" }, { status: 503 });
  }
}
