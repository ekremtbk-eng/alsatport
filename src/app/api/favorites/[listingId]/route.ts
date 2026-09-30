import { NextResponse } from "next/server";
import { removeFavorite } from "@/lib/favorites/store";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";

type Ctx = { params: Promise<{ listingId: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const { listingId } = await ctx.params;
  const result = await removeFavorite(auth.user.id, listingId);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
