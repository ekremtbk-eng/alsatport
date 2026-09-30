import { NextResponse } from "next/server";
import { isValidEmail, normalizeEmail, normalizeUsername } from "@/lib/auth";
import { isStrongPassword } from "@/lib/security/passwordPolicy";
import { hashPassword } from "@/lib/security/password";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { sanitizeEmail, sanitizeText } from "@/lib/security/sanitize";
import { findUserByIdentifier, saveUser } from "@/lib/security/userStore";
import { attachSession, requireMutatingRequest } from "@/lib/security/session";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import type { UserProfile } from "@/data/store";
import { FREE_LISTING_QUOTA } from "@/lib/listingQuota";
import { standardPackageFields } from "@/lib/entitlements";
import { recordAccountSignals } from "@/lib/security/abuseGuard";
import { sendSignupVerificationEmail } from "@/lib/mail/authMail";
import { verifyRecaptchaToken } from "@/lib/security/recaptcha";

export const maxDuration = 60;

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
    fullName: "",
    phone: "",
    birthDate: "",
    nationalId: "",
    address: "",
    emailVerified: false,
    profileComplete: false,
    authProvider: "email",
    role: "member",
    ...partial,
  };
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const ip = clientIp(req);
  const limited = rateLimit(`register:${ip}`, LIMITS.register.limit, LIMITS.register.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const body = (await req.json().catch(() => null)) as
    | {
        username?: string;
        email?: string;
        password?: string;
        firstName?: string;
        lastName?: string;
        marketing?: boolean;
        phone?: string;
        recaptchaToken?: string;
      }
    | null;
  const captcha = await verifyRecaptchaToken(body?.recaptchaToken, "register", ip);
  if (!captcha.ok) {
    return NextResponse.json({ ok: false, error: captcha.error }, { status: 400 });
  }
  const email = normalizeEmail(sanitizeEmail(body?.email));
  const firstName = sanitizeText(body?.firstName, 40);
  const lastName = sanitizeText(body?.lastName, 40);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const password = typeof body?.password === "string" ? body.password : "";
  const phone = (typeof body?.phone === "string" ? body.phone : "").replace(/\D/g, "").slice(0, 11);
  const username = normalizeUsername(
    sanitizeText(body?.username, 40) || email.split("@")[0] || "uye",
  );

  if (!email || !password || !fullName) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  if (fullName.split(/\s+/).length < 2) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "auth.err.email" }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json({ ok: false, error: "auth.err.passPolicy" }, { status: 400 });
  }
  if (await findUserByIdentifier(email)) {
    return NextResponse.json({ ok: false, error: "auth.err.taken" }, { status: 409 });
  }
  let uniqueName = username.replace(/[^a-z0-9._-]+/g, "") || "uye";
  if (await findUserByIdentifier(uniqueName)) {
    uniqueName = `${uniqueName}${Math.floor(Math.random() * 99)}`;
  }

  const passwordHash = await hashPassword(password);
  const profile = blankProfile({
    username: uniqueName,
    displayName: fullName,
    fullName,
    email,
    phone,
    address: "",
    emailVerified: false,
    profileComplete: false,
    authProvider: "email",
    role: "seller",
    verified: false,
  });
  const user = await saveUser({
    id: profile.id,
    email,
    username: uniqueName,
    passwordHash,
    provider: "email",
    role: "seller",
    profile: stampVerification(profile),
  });
  await recordAccountSignals(user.id, req);
  await sendSignupVerificationEmail({
    userId: user.id,
    email,
    name: fullName || uniqueName,
  });
  const res = NextResponse.json({
    ok: true,
    needsProfile: !isProfileComplete(user.profile),
    needsEmailVerify: true,
    user: user.profile,
  });
  return attachSession(res, user);
}
