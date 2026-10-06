import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ACCESS, COOKIE_REFRESH } from "@/lib/security/cookies";
import { findUserById, publicProfile, saveUser } from "@/lib/security/userStore";
import { attachSession, clearSession, currentSession, revokeSession } from "@/lib/security/session";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import { entitlementsChanged, listingPatchForProfile, reconcileEntitlements } from "@/lib/entitlements";

export async function GET() {
  const current = await currentSession();
  if (!current) {
    const jar = await cookies();
    const res = NextResponse.json({ ok: true, user: null });
    // Revoked, expired or pre-session-table tokens: drop the stale cookies.
    return jar.get(COOKIE_ACCESS) || jar.get(COOKIE_REFRESH) ? clearSession(res) : res;
  }
  const user = await findUserById(current.claims.sub);
  if (!user) return clearSession(NextResponse.json({ ok: true, user: null }));
  if (user.bannedAt) {
    await revokeSession(current.session.id, "banned");
    return clearSession(NextResponse.json({ ok: true, user: null }));
  }
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
    adminMfa: stored.role === "admin" ? !!current.session.mfaAt : undefined,
  });
  return attachSession(res, stored);
}
