import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeUsername } from "@/lib/auth";
import { hashPassword } from "@/lib/security/password";
import { clientIp } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { findUserByEmail, findUserByUsername, saveUser } from "@/lib/security/userStore";
import { requireMutatingRequest, startSession } from "@/lib/security/session";
import { THROTTLE, throttle, tooMany } from "@/lib/security/throttle";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import type { UserProfile } from "@/data/store";
import { FREE_LISTING_QUOTA } from "@/lib/listingQuota";
import { standardPackageFields } from "@/lib/entitlements";
import { recordAccountSignals } from "@/lib/security/abuseGuard";
import { sendSignupVerificationEmail } from "@/lib/mail/authMail";
import { verifyRecaptchaToken } from "@/lib/security/recaptcha";
import { readJson } from "@/lib/security/parseBody";
import { registerBodySchema } from "@/lib/security/schemas";
import { resolveMemberPlace } from "@/lib/geo/neighborhoods";
import { isValidPhone, nationalPhoneDigits } from "@/lib/profile";
import { marketingChoices } from "@/lib/privacy/marketingChoices";
import { recordMarketingChoice } from "@/lib/privacy/consents";

function isUniqueConstraint(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

function uniqueTarget(err: unknown): string {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return "";
  const meta = err.meta as { target?: string | string[] } | undefined;
  const target = meta?.target;
  if (Array.isArray(target)) return target.join(",");
  return typeof target === "string" ? target : "";
}

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

  const parsed = await readJson(req, registerBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  // Captcha before register throttle: failed security checks must not burn the hourly IP quota.
  // Broader write budgets still apply in middleware (apiWrite / apiWriteIp).
  const captcha = await verifyRecaptchaToken(body.recaptchaToken, "register", ip);
  if (!captcha.ok) {
    console.warn("register captcha rejected", {
      stage: "register",
      reason: "recaptcha",
      tokenPresent: typeof body.recaptchaToken === "string" && body.recaptchaToken.length >= 20,
    });
    return NextResponse.json({ ok: false, error: captcha.error }, { status: 400 });
  }
  const limited = await throttle([{ key: `register:ip:${ip}`, ...THROTTLE.register }], req);
  if (!limited.ok) {
    console.warn("register throttled", { stage: "register", reason: "rate-limit", retryAfter: limited.retryAfter });
    return tooMany(limited.retryAfter);
  }
  const email = body.email;
  const firstName = sanitizeText(body.firstName, 40);
  const lastName = sanitizeText(body.lastName, 40);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const password = body.password;
  const modern =
    body.city.length > 0 ||
    body.termsAccepted !== undefined ||
    body.kvkkRead !== undefined ||
    body.marketingEmail !== undefined ||
    body.marketingSms !== undefined ||
    body.passwordConfirm.length > 0;
  const phone = body.phone.trim() ? (isValidPhone(body.phone) ? `0${nationalPhoneDigits(body.phone)}` : "") : "";
  const username = normalizeUsername(sanitizeText(body.username, 40) || email.split("@")[0] || "uye");
  const place = body.city ? resolveMemberPlace(body.city, body.district, body.neighborhood) : null;

  if (body.phone.trim() && !phone) {
    return NextResponse.json({ ok: false, error: "complete.err.phone" }, { status: 400 });
  }
  if (modern) {
    if (body.termsAccepted !== true) {
      return NextResponse.json({ ok: false, error: "auth.err.terms" }, { status: 400 });
    }
    if (body.passwordConfirm !== password) {
      return NextResponse.json({ ok: false, error: "auth.err.passMatch" }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ ok: false, error: "complete.err.phone" }, { status: 400 });
    }
    if (!place) {
      return NextResponse.json({ ok: false, error: "auth.err.place" }, { status: 400 });
    }
  }

  if (!fullName || fullName.split(/\s+/).length < 2) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  if (await findUserByEmail(email)) {
    // Same cost as a real hash, and no "already registered" text, so the response does not confirm the address.
    await hashPassword(password);
    return NextResponse.json({ ok: false, error: "auth.err.signup" }, { status: 400 });
  }
  // profiles_phone_uidx (partial unique): colliding phone must be a 400, never an uncaught 500.
  if (phone) {
    const phoneTaken = await prisma.profile.findFirst({
      where: { phone },
      select: { userId: true },
    });
    if (phoneTaken) {
      await hashPassword(password);
      return NextResponse.json({ ok: false, error: "auth.err.phoneTaken" }, { status: 400 });
    }
  }
  let uniqueName = username.replace(/[^a-z0-9._-]+/g, "") || "uye";
  if (await findUserByUsername(uniqueName)) {
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
    city: place?.city ?? "",
    district: place?.district ?? "",
    neighborhood: place?.neighborhood ?? "",
    emailVerified: false,
    profileComplete: false,
    authProvider: "email",
    role: "seller",
    verified: false,
  });
  let user;
  try {
    user = await saveUser({
      id: profile.id,
      email,
      username: uniqueName,
      passwordHash,
      provider: "email",
      role: "seller",
      profile: stampVerification(profile),
    });
    const choice = marketingChoices(body);
    const now = new Date();
    await prisma.profile.update({
      where: { userId: user.id },
      data: {
        ...(body.kvkkRead === true ? { kvkkNotifiedAt: now } : {}),
        ...(body.termsAccepted === true ? { termsAcceptedAt: now } : {}),
        ...(choice.email || choice.sms ? { marketingUpdatedAt: now } : {}),
        marketingEmail: choice.email,
        marketingSms: choice.sms,
        phoneVerifiedAt: null,
      },
    });
    user.profile.marketingEmail = choice.email;
    user.profile.marketingSms = choice.sms;
    user.profile.phoneVerified = false;
    if (modern || body.marketing !== undefined || body.marketingEmail !== undefined) {
      await recordMarketingChoice(user.id, "email", choice.email, "register");
    }
    if (modern || body.marketingSms !== undefined) {
      await recordMarketingChoice(user.id, "sms", choice.sms, "register");
    }
  } catch (err) {
    if (isUniqueConstraint(err)) {
      const target = uniqueTarget(err);
      console.warn("register unique constraint", {
        stage: "register",
        reason: "unique",
        target: target || "unknown",
      });
      // Match pre-check messaging; email/username collisions stay opaque.
      const error =
        /\bphone\b/i.test(target) || target.includes("profiles_phone")
          ? "auth.err.phoneTaken"
          : "auth.err.signup";
      return NextResponse.json({ ok: false, error }, { status: 400 });
    }
    console.error("register persist failed", {
      stage: "register",
      reason: "persist",
      code: err instanceof Prisma.PrismaClientKnownRequestError ? err.code : "unknown",
    });
    return NextResponse.json({ ok: false, error: "auth.err.server" }, { status: 500 });
  }
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
  await startSession(res, user, req, { method: "register" });
  return res;
}
