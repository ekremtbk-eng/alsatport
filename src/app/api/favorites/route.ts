import { NextResponse } from "next/server";
import { addFavorite, listFavoriteIds } from "@/lib/favorites/store";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { listingIdBodySchema } from "@/lib/security/schemas";

export async function GET() {
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const listingIds = await listFavoriteIds(auth.user.id);
  return NextResponse.json({ ok: true, listingIds });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const parsed = await readJson(req, listingIdBodySchema);
  if (!parsed.ok) return parsed.response;
  const result = await addFavorite(auth.user.id, parsed.data.listingId);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
