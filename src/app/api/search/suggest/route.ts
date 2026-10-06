import { NextResponse } from "next/server";
import { z } from "zod";
import { LIMITS, clientRateKey, rateLimit } from "@/lib/security/rateLimit";
import { sanitizeSearchQuery, looksLikeSqli } from "@/lib/security/inputGuard";
import { parseSearch } from "@/lib/security/parseBody";
import { suggestPublicListings } from "@/lib/listings/store";

const suggestQuerySchema = z.object({
  q: z
    .string()
    .max(80)
    .optional()
    .default("")
    .refine((v) => !v || !looksLikeSqli(v), "auth.err.required"),
});

export async function GET(req: Request) {
  const limited = rateLimit(clientRateKey(req, "search-suggest"), LIMITS.apiRead.limit, LIMITS.apiRead.windowMs, req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const url = new URL(req.url);
  const query = parseSearch(url, suggestQuerySchema);
  if (!query) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  const q = sanitizeSearchQuery(query.q);
  if (q.length < 2) {
    return NextResponse.json({ ok: true, listings: [] });
  }
  try {
    const listings = await suggestPublicListings(q, 8);
    return NextResponse.json({ ok: true, listings });
  } catch {
    return NextResponse.json({ ok: true, listings: [] });
  }
}
