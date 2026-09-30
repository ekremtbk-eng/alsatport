import { NextResponse } from "next/server";
import { listSellerReviews, upsertSellerReview } from "@/lib/reviews/store";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";

export const maxDuration = 30;

export async function GET(req: Request) {
  const sellerId = new URL(req.url).searchParams.get("sellerId") ?? "";
  const reviews = await listSellerReviews(sellerId);
  return NextResponse.json({ ok: true, reviews });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const ip = clientIp(req);
  const limited = rateLimit(`review:${ip}:${auth.user.id}`, LIMITS.listing.limit, LIMITS.listing.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const body = (await req.json().catch(() => null)) as {
    sellerId?: string;
    listingId?: string;
    rating?: number;
    text?: string;
  } | null;
  const saved = await upsertSellerReview({
    sellerId: body?.sellerId ?? "",
    authorId: auth.user.id,
    listingId: body?.listingId,
    rating: Number(body?.rating ?? 0),
    text: body?.text ?? "",
  });
  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: saved.status });
  }
  return NextResponse.json({ ok: true, review: saved.review });
}
