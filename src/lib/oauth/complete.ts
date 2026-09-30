import "server-only";
import type { AuthProviderKind } from "@/lib/auth";
import { isValidEmail, normalizeEmail, normalizeUsername } from "@/lib/auth";
import type { UserProfile } from "@/data/store";
import { FREE_LISTING_QUOTA } from "@/lib/listingQuota";
import { reconcileEntitlements, standardPackageFields } from "@/lib/entitlements";
import { sendSignupVerificationEmail } from "@/lib/mail/authMail";
import { oauthCallbackPath } from "@/lib/site";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import { recordAccountSignals } from "@/lib/security/abuseGuard";
import { findUserByGoogleSub, findUserByIdentifier, saveUser } from "@/lib/security/userStore";

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

export function oauthCallbackUrl(provider: string) {
  return oauthCallbackPath(provider);
}

export async function upsertVerifiedOAuthUser(identity: VerifiedOAuthIdentity, req: Request) {
  if (!identity.sub) return { error: "auth.err.oauth" as const };
  const email = normalizeEmail(identity.email);
  if (!isValidEmail(email) || !identity.emailVerified) {
    return { error: "auth.err.email" as const };
  }

  let user = await findUserByGoogleSub(identity.sub);
  if (!user) user = await findUserByIdentifier(email);

  const name = identity.name.trim();
  const completeName = name.split(/\s+/).filter(Boolean).length >= 2 ? name : "";

  if (user) {
    user = await saveUser({
      ...user,
      email,
      googleSub: identity.sub,
      provider: user.provider === "email" ? "email" : identity.provider,
      role: user.role === "admin" ? "admin" : completeName ? "seller" : user.role,
      profile: stampVerification(
        reconcileEntitlements({
          ...user.profile,
          email,
          fullName: user.profile.fullName || completeName,
          displayName: user.profile.fullName || completeName || user.profile.displayName,
          avatar: identity.picture || user.profile.avatar,
          authProvider: user.profile.authProvider === "email" ? "email" : identity.provider,
          emailVerified: user.profile.emailVerified === true,
          role: user.role === "admin" ? "admin" : completeName ? "seller" : user.profile.role,
        }),
      ),
    });
    let mailSent = user.profile.emailVerified === true;
    if (!mailSent) {
      const mailed = await sendSignupVerificationEmail({
        userId: user.id,
        email,
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
  } else {
    const username =
      normalizeUsername(email.split("@")[0] || `${identity.provider}uye`).replace(/[^a-z0-9._-]+/g, "") ||
      `${identity.provider}uye`;
    const taken = await findUserByIdentifier(username);
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
    user = await saveUser({
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
}

export function safeNextPath(raw: string | null | undefined) {
  const next = (raw ?? "").trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) return "/profil";
  return next.slice(0, 200);
}
