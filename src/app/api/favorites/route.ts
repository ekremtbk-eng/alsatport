import { NextResponse } from "next/server";
import { addFavorite, listFavoriteIds } from "@/lib/favorites/store";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";

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
  const body = (await req.json().catch(() => null)) as { listingId?: string } | null;
  const result = await addFavorite(auth.user.id, body?.listingId ?? "");
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
