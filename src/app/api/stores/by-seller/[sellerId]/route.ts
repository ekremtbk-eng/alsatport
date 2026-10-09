import { NextResponse } from "next/server";
import { findPublicFirmBySeller } from "@/lib/business/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sellerId: string }> };

/** Public service profile of an approved business; `firm: null` for everyone else. */
export async function GET(_req: Request, { params }: Ctx) {
  const { sellerId } = await params;
  try {
    const firm = await findPublicFirmBySeller(sellerId);
    return NextResponse.json(
      { ok: true, firm },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "auth.err.server" }, { status: 503 });
  }
}
