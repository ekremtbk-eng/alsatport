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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limited = rateLimit(clientRateKey(req, "listings-get"), LIMITS.apiRead.limit, LIMITS.apiRead.windowMs, req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const claims = await claimsFromCookies();
  const mine = url.searchParams.get("mine") === "1";
  const priceMin = Number(url.searchParams.get("priceMin"));
  const priceMax = Number(url.searchParams.get("priceMax"));
  const listings = await queryListings({
    q: sanitizeSearchQuery(url.searchParams.get("q") ?? ""),
    categoryId: sanitizeSlug(url.searchParams.get("categoryId") ?? url.searchParams.get("kategori") ?? "") || undefined,
    city: sanitizeText(url.searchParams.get("city"), 40) || undefined,
    district: sanitizeText(url.searchParams.get("district"), 40) || undefined,
    priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
    priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
    status: url.searchParams.get("status") === "passive" ? "passive" : url.searchParams.get("status") === "active" ? "active" : undefined,
    viewerId: claims?.sub,
    sellerId: url.searchParams.get("sellerId") ?? undefined,
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

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const captcha = await verifyRecaptchaToken(body?.recaptchaToken, "listing", ip);
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
