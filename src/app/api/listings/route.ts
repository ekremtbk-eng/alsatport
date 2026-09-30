import { NextResponse } from "next/server";
import { LIMITS, clientIp, clientRateKey, rateLimit } from "@/lib/security/rateLimit";
import { sanitizeSearchQuery, sanitizeSlug } from "@/lib/security/inputGuard";
import { sanitizeText } from "@/lib/security/sanitize";
import { claimsFromCookies, requireMutatingRequest, requireUser } from "@/lib/security/session";
import { isProfileComplete } from "@/lib/profile";
import { canPublishListing, expiresAtForUser, listingIsPromoted, remainingListingSlots } from "@/lib/listingQuota";
import { entitlementsChanged, reconcileEntitlements } from "@/lib/entitlements";
import { saveUser } from "@/lib/security/userStore";
import { createListing, parseListingInput, queryListings } from "@/lib/listings/store";
import { verifyRecaptchaToken } from "@/lib/security/recaptcha";
import { parseSearch, readJson } from "@/lib/security/parseBody";
import { listingCreateBodySchema, listingQuerySchema } from "@/lib/security/schemas";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limited = rateLimit(clientRateKey(req, "listings-get"), LIMITS.apiRead.limit, LIMITS.apiRead.windowMs, req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const query = parseSearch(url, listingQuerySchema);
  if (!query) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  const claims = await claimsFromCookies();
  const mine = query.mine === "1";
  const priceMin = Number(query.priceMin);
  const priceMax = Number(query.priceMax);
  const listings = await queryListings({
    q: sanitizeSearchQuery(query.q),
    categoryId: sanitizeSlug(query.categoryId || query.kategori) || undefined,
    city: sanitizeText(query.city, 40) || undefined,
    district: sanitizeText(query.district, 40) || undefined,
    priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
    priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
    status: query.status,
    viewerId: claims?.sub,
    sellerId: query.sellerId,
    mine: mine && !!claims?.sub,
  });
  return NextResponse.json({ ok: true, listings });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const stamped = reconcileEntitlements(auth.user.profile);
  if (entitlementsChanged(auth.user.profile, stamped)) {
    auth.user.profile = stamped;
    await saveUser(auth.user);
  }
  if (!isProfileComplete(auth.user.profile)) {
    return NextResponse.json({ ok: false, error: "auth.err.forbidden" }, { status: 403 });
  }

  const ip = clientIp(req);
  const limited = rateLimit(`listing:${ip}:${auth.user.id}`, LIMITS.listing.limit, LIMITS.listing.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  if (!canPublishListing(auth.user.profile)) {
    return NextResponse.json({ ok: false, error: "quota.exhausted" }, { status: 402 });
  }

  const parsedBody = await readJson(req, listingCreateBodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data as Record<string, unknown>;
  const captcha = await verifyRecaptchaToken(
    typeof parsedBody.data.recaptchaToken === "string" ? parsedBody.data.recaptchaToken : undefined,
    "listing",
    ip,
  );
  if (!captcha.ok) {
    return NextResponse.json({ ok: false, error: captcha.error }, { status: 400 });
  }
  const parsed = parseListingInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const plan = auth.user.profile.plan;
  parsed.expiresAt = parsed.expiresAt ?? expiresAtForUser(auth.user.profile);
  parsed.featured = listingIsPromoted(auth.user.profile);
  parsed.vip = plan === "vip" || listingIsPromoted(auth.user.profile);

  const created = await createListing(auth.user, parsed);
  if ("error" in created) {
    return NextResponse.json({ ok: false, error: created.error }, { status: 400 });
  }

  const posted = (auth.user.profile.listingsPosted ?? 0) + 1;
  return NextResponse.json({
    ok: true,
    listing: created.listing,
    id: created.listing.id,
    title: created.listing.title,
    description: created.listing.description,
    expiresAt: created.listing.expiresAt,
    featured: created.listing.featured,
    vip: created.listing.vip,
    listingsPosted: posted,
    remaining: remainingListingSlots({ ...auth.user.profile, listingsPosted: posted }),
  });
}
