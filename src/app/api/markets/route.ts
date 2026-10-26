import { NextResponse } from "next/server";
import { getMarkets } from "@/lib/markets/load";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = rateLimit(`markets:${clientIp(req)}`, 30, 60_000, req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false },
      {
        status: 429,
        headers: {
          "Retry-After": String(limited.retryAfter),
          "Cache-Control": "no-store",
        },
      },
    );
  }
  const body = await getMarkets();
  const hasPrice = body.quotes.some((quote) => quote.status === "ok");
  const liveSpot = body.quotes.some((quote) => quote.source === "gold-api" && quote.status === "ok");
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": hasPrice ? `public, max-age=${liveSpot ? 30 : 60}, stale-while-revalidate=300` : "public, max-age=15",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
