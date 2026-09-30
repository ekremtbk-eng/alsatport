import { NextResponse } from "next/server";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { publicProfile, saveUser } from "@/lib/security/userStore";
import { entitlementsChanged, listingPatchForProfile, reconcileEntitlements } from "@/lib/entitlements";

/** Aktif paket, kota ve süre — panel /paketler senkronu. */
export async function GET() {
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const stamped = reconcileEntitlements(auth.user.profile);
  const stored = entitlementsChanged(auth.user.profile, stamped)
    ? await saveUser({ ...auth.user, profile: stamped })
    : { ...auth.user, profile: stamped };
  const profile = publicProfile(stored);
  return NextResponse.json({
    ok: true,
    user: profile,
    listingPatch: listingPatchForProfile(profile),
  });
}

/** Paket yalnızca PayTR webhook sonrası tanımlanır. */
export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  return NextResponse.json({ ok: false, error: "pay.campaign" }, { status: 403 });
}
