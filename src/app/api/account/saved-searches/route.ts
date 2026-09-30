import { NextResponse } from "next/server";
import { createSavedSearch, deleteSavedSearch, loadUserAlertSettings } from "@/lib/alerts/store";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";

export async function GET() {
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const data = await loadUserAlertSettings(auth.user.id);
  return NextResponse.json({ ok: true, savedSearches: data.savedSearches });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const limited = rateLimit(
    `saved-search:${clientIp(req)}:${auth.user.id}`,
    LIMITS.profile.limit,
    LIMITS.profile.windowMs,
    req,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const body = (await req.json().catch(() => null)) as {
    query?: string;
    city?: string;
    filter?: string;
    seenIds?: string[];
  } | null;
  const saved = await createSavedSearch(auth.user.id, {
    query: body?.query,
    city: body?.city,
    filter: body?.filter,
    seenIds: body?.seenIds,
  });
  if ("error" in saved) {
    return NextResponse.json({ ok: false, error: saved.error }, { status: saved.status });
  }
  return NextResponse.json({ ok: true, search: saved.search, duplicate: saved.duplicate });
}

export async function DELETE(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const deleted = await deleteSavedSearch(auth.user.id, id);
  if ("error" in deleted) {
    return NextResponse.json({ ok: false, error: deleted.error }, { status: deleted.status });
  }
  return NextResponse.json({ ok: true });
}
