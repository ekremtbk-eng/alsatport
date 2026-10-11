import "server-only";
import type { AuthProviderKind } from "@/lib/auth";
import { isValidEmail, normalizeEmail, normalizeUsername } from "@/lib/auth";
import type { UserProfile } from "@/data/store";
import { FREE_LISTING_QUOTA } from "@/lib/listingQuota";
import { reconcileEntitlements, standardPackageFields } from "@/lib/entitlements";
import { sendSecurityNoticeEmail, sendSignupVerificationEmail } from "@/lib/mail/authMail";
import { oauthCallbackPath } from "@/lib/site";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import { writeAudit } from "@/lib/admin/audit";
import { recordAccountSignals } from "@/lib/security/abuseGuard";
import { recordSecurityNotice } from "@/lib/security/alerts";
import {
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  findUserByUsername,
  saveUser,
  type StoredUser,
} from "@/lib/security/userStore";
import { revokeUserSessions } from "@/lib/security/session";

export type VerifiedOAuthIdentity = {
  provider: AuthProviderKind;
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
};

function blankProfile(partial: Partial<UserProfile>): UserProfile {
  return {
    id: crypto.randomUUID(),
    username: "uye",
    displayName: "Yeni Üye",
    avatar:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=200&q=80",
    verified: false,
    memberSince: new Date().toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    listings: 0,
    sales: 0,
    stars: 0,
    followers: 0,
    following: 0,
    city: "",
    ...standardPackageFields(FREE_LISTING_QUOTA),
    address: "",
    emailVerified: false,
    profileComplete: false,
    role: "member",
    ...partial,
  };
}

/** Account security page; provider linking always starts and ends here. */
export const LINK_RETURN = "/profil?p=guvenlik";

export function oauthCallbackUrl(provider: string) {
  return oauthCallbackPath(provider);
}

function completeNameOf(identity: VerifiedOAuthIdentity) {
  const name = identity.name.trim();
  return name.split(/\s+/).filter(Boolean).length >= 2 ? name : "";
}

/** Fills empty profile fields from the provider; never touches the e-mail, password or provider id. */
async function refreshFromProvider(user: StoredUser, identity: VerifiedOAuthIdentity) {
  const completeName = completeNameOf(identity);
  return saveUser({
    ...user,
    role: user.role === "admin" ? "admin" : completeName ? "seller" : user.role,
    profile: stampVerification(
      reconcileEntitlements({
        ...user.profile,
        fullName: user.profile.fullName || completeName,
        displayName: user.profile.fullName || completeName || user.profile.displayName,
        avatar: user.profile.avatar || identity.picture || "",
        role: user.role === "admin" ? "admin" : completeName ? "seller" : user.profile.role,
      }),
    ),
  });
}

async function signedIn(user: StoredUser) {
  let mailSent = user.profile.emailVerified === true;
  if (!mailSent) {
    const mailed = await sendSignupVerificationEmail({
      userId: user.id,
      email: user.email,
      name: user.profile.fullName || user.profile.displayName,
    });
    mailSent = mailed.ok;
  }
  return {
    user,
    needsProfile: !isProfileComplete(user.profile),
    needsEmailVerify: user.profile.emailVerified !== true,
    mailSent,
  };
}

/**
 * Social sign-in. An account is entered only through the provider id it is already linked to.
 * A verified account with the same e-mail is never linked here: its owner must sign in with their
 * existing method and link the provider from account security (`linkOAuthIdentity`).
 */
export async function upsertVerifiedOAuthUser(identity: VerifiedOAuthIdentity, req: Request) {
  if (!identity.sub) return { error: "auth.err.oauth" as const };
  const email = normalizeEmail(identity.email);
  if (!isValidEmail(email) || !identity.emailVerified) {
    return { error: "auth.err.email" as const };
  }

  const linked = await findUserByGoogleSub(identity.sub);
  if (linked) return signedIn(await refreshFromProvider(linked, identity));

  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.googleSub) return { error: "auth.err.oauthLinked" as const };
    if (existing.role === "admin" || existing.profile.emailVerified === true) {
      return { linkRequired: true as const };
    }
    // Pre-registration takeover guard: someone signed up with this exact address and a password but never
    // proved owning it. The provider has now proven it, so that password and its sessions are discarded.
    await revokeUserSessions(existing.id, "oauth-claimed-unverified-email");
    const claimed = await saveUser({
      ...existing,
      passwordHash: undefined,
      googleSub: identity.sub,
      provider: identity.provider,
      profile: { ...existing.profile, emailVerified: true, authProvider: identity.provider },
    });
    await writeAudit({ actorId: claimed.id, action: "auth.oauth_claim_unverified", entityType: "security", entityId: claimed.id });
    return signedIn(await refreshFromProvider(claimed, identity));
  }

  const name = identity.name.trim();
  const completeName = completeNameOf(identity);
  const username =
    normalizeUsername(email.split("@")[0] || `${identity.provider}uye`).replace(/[^a-z0-9._-]+/g, "") ||
    `${identity.provider}uye`;
  const taken = await findUserByUsername(username);
  const unique = taken ? `${username}${Math.floor(Math.random() * 99)}` : username;
  const display = completeName || `${name || identity.provider} Üye`.trim();
  const profile = stampVerification(
    blankProfile({
      username: unique,
      displayName: display,
      fullName: display,
      email,
      avatar: identity.picture || undefined,
      authProvider: identity.provider,
      emailVerified: false,
      address: "",
      profileComplete: false,
      role: "seller",
      verified: false,
    }),
  );
  const user = await saveUser({
    id: profile.id,
    email,
    username: unique,
    provider: identity.provider,
    googleSub: identity.sub,
    role: "seller",
    profile,
  });
  await recordAccountSignals(user.id, req);
  const mailed = await sendSignupVerificationEmail({
    userId: user.id,
    email,
    name: display,
  });
  return {
    user,
    needsProfile: !isProfileComplete(user.profile),
    needsEmailVerify: true,
    mailSent: mailed.ok,
  };
}

/**
 * Links a provider identity to an account whose owner just re-authenticated (checked by the caller).
 * An existing link is never replaced, and the account e-mail stays as it is.
 */
export async function linkOAuthIdentity(userId: string, identity: VerifiedOAuthIdentity) {
  if (!identity.sub || !identity.emailVerified) return { error: "auth.err.email" as const };
  const user = await findUserById(userId);
  if (!user || user.bannedAt) return { error: "auth.err.session" as const };
  const owner = await findUserByGoogleSub(identity.sub);
  if (owner && owner.id !== user.id) return { error: "auth.err.oauthLinked" as const };
  if (user.googleSub && user.googleSub !== identity.sub) return { error: "auth.err.oauthLinked" as const };
  if (user.googleSub === identity.sub) return { user, already: true as const };

  const linked = await saveUser({ ...user, googleSub: identity.sub });
  await writeAudit({
    actorId: linked.id,
    action: "auth.oauth_linked",
    entityType: "security",
    entityId: linked.id,
    payload: { provider: identity.provider },
  });
  const title = "Sosyal giriş hesabı bağlandı";
  const body = `AlsatPort hesabınıza ${identity.provider === "apple" ? "Apple" : "Google"} ile giriş bağlandı. Siz yapmadıysanız şifrenizi değiştirin ve tüm cihazlardan çıkış yapın.`;
  await sendSecurityNoticeEmail(linked.email, title, body).catch(() => undefined);
  await recordSecurityNotice(linked.id, "security.email", title, body);
  return { user: linked, already: false as const };
}

export { safeNextPath } from "@/lib/oauth/nextPath";
