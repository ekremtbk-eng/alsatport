import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ACCESS, COOKIE_REFRESH } from "@/lib/security/cookies";
import { verifyAuthToken } from "@/lib/security/jwt";
import { findUserById, publicProfile, saveUser } from "@/lib/security/userStore";
import { attachSession, clearSession } from "@/lib/security/session";
import { promoteConfiguredAdmin } from "@/lib/admin/audit";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import { entitlementsChanged, listingPatchForProfile, reconcileEntitlements } from "@/lib/entitlements";

export async function GET() {
  const jar = await cookies();
  const access = jar.get(COOKIE_ACCESS)?.value;
  const refresh = jar.get(COOKIE_REFRESH)?.value;
  let id: string | null = null;
  if (access) {
    const claims = await verifyAuthToken(access, "access");
    if (claims) id = claims.id || claims.sub;
  }
  if (!id && refresh) {
    const claims = await verifyAuthToken(refresh, "refresh");
    if (claims) id = claims.id || claims.sub;
  }
  if (!id) return NextResponse.json({ ok: true, user: null });
  let user = await findUserById(id);
  if (!user) return NextResponse.json({ ok: true, user: null });
  if (user.bannedAt) {
    const res = NextResponse.json({ ok: true, user: null });
    return clearSession(res);
  }
  user = await promoteConfiguredAdmin(user);
  const stamped = reconcileEntitlements(stampVerification(user.profile));
  const stored =
    entitlementsChanged(user.profile, stamped) || stamped.verified !== user.profile.verified
      ? await saveUser({ ...user, profile: stamped })
      : { ...user, profile: stamped };
  const profile = publicProfile(stored);
  const res = NextResponse.json({
    ok: true,
    user: { ...profile, id: stored.id },
    userId: stored.id,
    listingPatch: listingPatchForProfile(profile),
    needsProfile: !isProfileComplete(profile),
  });
  return attachSession(res, stored);
}
