import { NextResponse, after } from "next/server";
import { claimsFromCookies, requireMutatingRequest, requireUser } from "@/lib/security/session";
import { findUserById } from "@/lib/security/userStore";
import { promoteConfiguredAdmin } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import {
  bumpListingViews,
  deleteListingRecord,
  fillMissingListingCoords,
  findListingRecord,
  hideSellerPhone,
  toClientListing,
  updateListingRecord,
} from "@/lib/listings/store";
import { isLiveRow, notifyListingEvent } from "@/lib/listings/lifecycle";
import { listingCreateBodySchema } from "@/lib/security/schemas";
import { readJson } from "@/lib/security/parseBody";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const row = await findListingRecord(id);
  if (!row) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  const claims = await claimsFromCookies();
  const live = isLiveRow(row);
  if (!live) {
    if (!claims) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
    let viewer = await findUserById(claims.sub);
    if (viewer) viewer = await promoteConfiguredAdmin(viewer);
    const owner = viewer?.id === row.sellerId || viewer?.role === "admin";
    if (!owner) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  } else {
    await bumpListingViews(id);
  }
  const listing = toClientListing(row);
  if (live) listing.views += 1;
  return NextResponse.json({ ok: true, listing: hideSellerPhone(listing) });
}

export async function PUT(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const parsed = await readJson(req, listingCreateBodySchema.partial());
  if (!parsed.ok) return parsed.response;
  const updated = await updateListingRecord(auth.user, id, parsed.data as Record<string, unknown>);
  if ("error" in updated) {
    return NextResponse.json({ ok: false, error: updated.error }, { status: updated.status });
  }
  if (updated.listing.lat == null && typeof (parsed.data as { city?: unknown }).city === "string") {
    after(() => fillMissingListingCoords(id).catch(() => undefined));
  }
  const { ref, contentChanged, reactivated } = updated;
  if (reactivated) {
    after(() => notifyListingEvent(ref, "listing.renewed"));
  } else if (contentChanged) {
    const minute = String(Math.floor(Date.now() / 60_000));
    after(() => notifyListingEvent(ref, "listing.updated", { unique: minute }));
  }
  return NextResponse.json({ ok: true, listing: updated.listing });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const deleted = await deleteListingRecord(auth.user, id);
  if ("error" in deleted) {
    return NextResponse.json({ ok: false, error: deleted.error }, { status: deleted.status });
  }
  return NextResponse.json({ ok: true });
}
