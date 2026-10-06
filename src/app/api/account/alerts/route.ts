import { NextResponse } from "next/server";
import { loadUserAlertSettings, updateNotifPrefs } from "@/lib/alerts/store";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { notifPrefsSchema } from "@/lib/security/schemas";

export async function GET() {
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const data = await loadUserAlertSettings(auth.user.id);
  return NextResponse.json({ ok: true, ...data });
}

export async function PATCH(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const parsed = await readJson(req, notifPrefsSchema);
  if (!parsed.ok) return parsed.response;
  const data = await updateNotifPrefs(auth.user.id, parsed.data);
  return NextResponse.json({ ok: true, ...data });
}
