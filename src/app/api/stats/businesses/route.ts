import { NextResponse } from "next/server";
import { countVerifiedBusinesses } from "@/lib/business/store";

export const dynamic = "force-dynamic";

/** Number of admin-verified businesses (approved, owner not banned, no demo accounts). */
export async function GET() {
  try {
    const verifiedBusinesses = await countVerifiedBusinesses();
    return NextResponse.json(
      { ok: true, verifiedBusinesses },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "auth.err.server" }, { status: 503 });
  }
}
