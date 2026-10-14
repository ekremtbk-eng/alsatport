import { NextResponse, after } from "next/server";
import { LIMITS, clientRateKey, rateLimit } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { sanitizeSearchQuery, sanitizeSlug } from "@/lib/security/inputGuard";
import { sanitizeText } from "@/lib/security/sanitize";
import { claimsFromCookies, requireMutatingRequest, requireUser } from "@/lib/security/session";
import { isProfileComplete } from "@/lib/profile";
import { canPublishListing, expiresAtForUser, listingIsPromoted, remainingListingSlots } from "@/lib/listingQuota";
import { entitlementsChanged, reconcileEntitlements } from "@/lib/entitlements";
import { saveUser } from "@/lib/security/userStore";
import { lookupCategory } from "@/data/categories";
import {
  createListing,
  fillMissingListingCoords,
  findOwnDraftListing,
  hideSellerPhone,
  parseListingInput,
  queryListings,
} from "@/lib/listings/store";
import type { Listing } from "@/data/store";
import type { StoredUser } from "@/lib/security/userStore";
import { notifyListingEvent } from "@/lib/listings/lifecycle";
import { parseSearch, readJson } from "@/lib/security/parseBody";
import { listingCreateBodySchema, listingQuerySchema } from "@/lib/security/schemas";
import { filterFieldsForCategory, listingMatchesDynamicFilters } from "@/lib/categoryFilters";
import { serverFilterState } from "@/lib/filterUrl";
import { isPublicListing } from "@/lib/categoryCounts";
import { parseCountry } from "@/data/locations";
import { approvedVehicles } from "@/lib/vehicleRequests/store";

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
  const catRaw = query.categoryId || query.kategori;
  const catHit = catRaw ? lookupCategory(catRaw) : undefined;
  const listings = await queryListings({
    q: sanitizeSearchQuery(query.q),
    categoryId: catHit?.id || sanitizeSlug(catRaw) || undefined,
    city: sanitizeText(query.city, 40) || undefined,
    district: sanitizeText(query.district, 40) || undefined,
    country: parseCountry(query.ulke),
    currency: query.para,
    priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
    priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
    posted: query.posted,
    status: query.status,
    viewerId: query.count === "1" ? undefined : claims?.sub,
    sellerId: query.sellerId,
    mine: mine && !!claims?.sub && query.count !== "1",
  });
  let result = listings;
  if (catHit && !catHit.filter) {
    const fields = filterFieldsForCategory(catHit);
    const state = serverFilterState(url.searchParams, fields);
    if (Object.keys(state).length) result = listings.filter((l) => listingMatchesDynamicFilters(l, state, fields));
  }
  if (query.count === "1") return NextResponse.json({ ok: true, count: result.filter(isPublicListing).length });
  return NextResponse.json({ ok: true, listings: result.map(hideSellerPhone) });
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
  const parsedBody = await readJson(req, listingCreateBodySchema);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data as Record<string, unknown>;

  // A repeated publish of the same draft must not cost another slot or hit the quota wall.
  const already = await findOwnDraftListing(auth.user, parsedBody.data.id);
  if (already) return publishedResponse(auth.user.profile, already, 0);

  const limited = await throttle([{ key: `listing:${auth.user.id}`, limit: LIMITS.listing.limit, windowMs: LIMITS.listing.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  if (!canPublishListing(auth.user.profile)) {
    return NextResponse.json({ ok: false, error: "quota.exhausted" }, { status: 402 });
  }

  const parsed = parseListingInput(body, undefined, await approvedVehicles());
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const plan = auth.user.profile.plan;
  parsed.expiresAt = expiresAtForUser(auth.user.profile);
  parsed.featured = listingIsPromoted(auth.user.profile);
  parsed.vip = plan === "vip" || listingIsPromoted(auth.user.profile);

  const created = await createListing(auth.user, parsed);
  if ("error" in created) {
    return NextResponse.json({ ok: false, error: created.error }, { status: "status" in created ? created.status : 400 });
  }
  if (created.duplicate) return publishedResponse(auth.user.profile, created.listing, 0);
  if (created.listing.lat == null) {
    const listingId = created.listing.id;
    after(() => fillMissingListingCoords(listingId).catch(() => undefined));
  }
  const ref = created.ref;
  after(() => notifyListingEvent(ref, "listing.published"));
  return publishedResponse(auth.user.profile, created.listing, 1);
}

function publishedResponse(profile: StoredUser["profile"], listing: Listing, added: 0 | 1) {
  const posted = (profile.listingsPosted ?? 0) + added;
  return NextResponse.json({
    ok: true,
    listing,
    id: listing.id,
    title: listing.title,
    description: listing.description,
    expiresAt: listing.expiresAt,
    featured: listing.featured,
    vip: listing.vip,
    listingsPosted: posted,
    remaining: remainingListingSlots({ ...profile, listingsPosted: posted }),
    ...(added ? {} : { duplicate: true }),
  });
}
