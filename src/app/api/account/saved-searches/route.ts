import { NextResponse } from "next/server";
import { createSavedSearch, deleteSavedSearch, loadUserAlertSettings } from "@/lib/alerts/store";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { savedSearchBodySchema } from "@/lib/security/schemas";
import { isUuid } from "@/lib/ids";

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
  const parsed = await readJson(req, savedSearchBodySchema);
  if (!parsed.ok) return parsed.response;
  const saved = await createSavedSearch(auth.user.id, {
    query: parsed.data.query,
    city: parsed.data.city,
    filter: parsed.data.filter,
    seenIds: parsed.data.seenIds,
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
  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  const deleted = await deleteSavedSearch(auth.user.id, id);
  if ("error" in deleted) {
    return NextResponse.json({ ok: false, error: deleted.error }, { status: deleted.status });
  }
  return NextResponse.json({ ok: true });
}
