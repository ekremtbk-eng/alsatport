import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isProfileComplete, stampVerification } from "@/lib/profile";
import { LIMITS } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { digitsOnly, sanitizeMultiline, sanitizeText } from "@/lib/security/sanitize";
import { roleForProfile } from "@/lib/security/rbac";
import { saveUser } from "@/lib/security/userStore";
import { attachSession, requireMutatingRequest, requireUser } from "@/lib/security/session";
import { readJson } from "@/lib/security/parseBody";
import { profileBodySchema, profileFieldErrors } from "@/lib/security/schemas";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const limited = await throttle([{ key: `profile:${auth.user.id}`, limit: LIMITS.profile.limit, windowMs: LIMITS.profile.windowMs }], req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, profileBodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const fullName = sanitizeText(body.fullName, 80);
  const displayName = sanitizeText(body.displayName, 40);
  const phone = digitsOnly(body.phone, 11);
  const address = sanitizeMultiline(body.address, 400).replace(/\s+/g, " ").trim();

  const fieldErr = profileFieldErrors({ fullName, phone, address });
  if (fieldErr) {
    return NextResponse.json({ ok: false, error: fieldErr }, { status: 400 });
  }

  const oldPhone = auth.user.profile.phone;
  const merged = stampVerification({
    ...auth.user.profile,
    fullName: fullName || auth.user.profile.fullName,
    phone: phone || auth.user.profile.phone,
    address: address || auth.user.profile.address,
    displayName: displayName || fullName || auth.user.profile.displayName,
  });
  const role = roleForProfile(merged.verified, auth.user.role);
  const user = await saveUser({
    ...auth.user,
    role,
    profile: { ...merged, role },
  });
  if (phone && phone !== oldPhone) {
    await prisma.profile.update({
      where: { userId: user.id },
      data: { phoneVerifiedAt: null },
    });
    user.profile.phoneVerified = false;
  }

  const res = NextResponse.json({
    ok: true,
    needsProfile: !isProfileComplete(user.profile),
    user: user.profile,
  });
  return attachSession(res, user);
}
