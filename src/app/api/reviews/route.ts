import { NextResponse } from "next/server";
import { listSellerReviews, upsertSellerReview } from "@/lib/reviews/store";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { parseSearch, readJson } from "@/lib/security/parseBody";
import { reviewBodySchema, sellerQuerySchema } from "@/lib/security/schemas";

export const maxDuration = 30;

export async function GET(req: Request) {
  const query = parseSearch(new URL(req.url), sellerQuerySchema);
  if (!query?.sellerId) return NextResponse.json({ ok: true, reviews: [] });
  const reviews = await listSellerReviews(query.sellerId);
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
  const parsed = await readJson(req, reviewBodySchema);
  if (!parsed.ok) return parsed.response;
  const saved = await upsertSellerReview({
    sellerId: parsed.data.sellerId,
    authorId: auth.user.id,
    listingId: parsed.data.listingId,
    rating: parsed.data.rating,
    text: parsed.data.text ?? "",
  });
  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: saved.status });
  }
  return NextResponse.json({ ok: true, review: saved.review });
}
