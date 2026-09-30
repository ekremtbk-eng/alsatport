import { NextResponse } from "next/server";
import { claimsFromCookies, requireMutatingRequest, requireUser } from "@/lib/security/session";
import { findUserById } from "@/lib/security/userStore";
import { promoteConfiguredAdmin } from "@/lib/admin/audit";
import {
  bumpListingViews,
  deleteListingRecord,
  findListingRecord,
  toClientListing,
  updateListingRecord,
} from "@/lib/listings/store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = await findListingRecord(id);
  if (!row) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  if (row.status !== "active") {
    const claims = await claimsFromCookies();
    if (!claims) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
    let viewer = await findUserById(claims.sub);
    if (viewer) viewer = await promoteConfiguredAdmin(viewer);
    const owner = viewer?.id === row.sellerId || viewer?.role === "admin";
    if (!owner) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  } else {
    await bumpListingViews(id);
  }
  const listing = toClientListing(row);
  if (row.status === "active") listing.views += 1;
  return NextResponse.json({ ok: true, listing });
}

export async function PUT(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const updated = await updateListingRecord(auth.user, id, body ?? {});
  if ("error" in updated) {
    return NextResponse.json({ ok: false, error: updated.error }, { status: updated.status });
  }
  return NextResponse.json({ ok: true, listing: updated.listing });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("seller");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const deleted = await deleteListingRecord(auth.user, id);
  if ("error" in deleted) {
    return NextResponse.json({ ok: false, error: deleted.error }, { status: deleted.status });
  }
  return NextResponse.json({ ok: true });
}
