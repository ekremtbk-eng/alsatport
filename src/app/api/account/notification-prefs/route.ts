import { NextResponse } from "next/server";
import { loadNotificationPrefs, updateNotificationPrefs } from "@/lib/notifications/store";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { notificationPrefsPatchSchema } from "@/lib/security/schemas";

export async function GET() {
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const prefs = await loadNotificationPrefs(auth.user.id);
  return NextResponse.json({ ok: true, prefs }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const parsed = await readJson(req, notificationPrefsPatchSchema);
  if (!parsed.ok) return parsed.response;
  const prefs = await updateNotificationPrefs(auth.user.id, parsed.data.prefs);
  return NextResponse.json({ ok: true, prefs });
}
