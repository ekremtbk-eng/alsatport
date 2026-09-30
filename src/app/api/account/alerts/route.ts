import { NextResponse } from "next/server";
import { loadUserAlertSettings, updateNotifPrefs } from "@/lib/alerts/store";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";

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
  const body = (await req.json().catch(() => null)) as {
    priceDrop?: boolean;
    savedSearch?: boolean;
    nearby?: boolean;
  } | null;
  const data = await updateNotifPrefs(auth.user.id, {
    priceDrop: body?.priceDrop,
    savedSearch: body?.savedSearch,
    nearby: body?.nearby,
  });
  return NextResponse.json({ ok: true, ...data });
}
