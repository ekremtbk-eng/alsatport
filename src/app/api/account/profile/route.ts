import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  isAdult,
  isProfileComplete,
  isValidFullName,
  isValidIdentityNo,
  isValidOpenAddress,
  isValidPhone,
  stampVerification,
} from "@/lib/profile";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { digitsOnly, sanitizeMultiline, sanitizeText } from "@/lib/security/sanitize";
import { roleForProfile } from "@/lib/security/rbac";
import { saveUser } from "@/lib/security/userStore";
import { attachSession, requireMutatingRequest, requireUser } from "@/lib/security/session";

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;

  const ip = clientIp(req);
  const limited = rateLimit(`profile:${ip}:${auth.user.id}`, LIMITS.profile.limit, LIMITS.profile.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    fullName?: string;
    phone?: string;
    birthDate?: string;
    nationalId?: string;
    address?: string;
    displayName?: string;
  } | null;

  const fullName = sanitizeText(body?.fullName, 80);
  const displayName = sanitizeText(body?.displayName, 40);
  const phone = digitsOnly(body?.phone, 11);
  const birthDate = sanitizeText(body?.birthDate, 10);
  const nationalId = digitsOnly(body?.nationalId, 11);
  const address = sanitizeMultiline(body?.address, 400).replace(/\s+/g, " ").trim();

  if (fullName && !isValidFullName(fullName)) {
    return NextResponse.json({ ok: false, error: "complete.err.name" }, { status: 400 });
  }
  if (phone && !isValidPhone(phone)) {
    return NextResponse.json({ ok: false, error: "complete.err.phone" }, { status: 400 });
  }
  if (birthDate && !isAdult(birthDate)) {
    return NextResponse.json({ ok: false, error: "complete.err.age" }, { status: 400 });
  }
  if (nationalId && !isValidIdentityNo(nationalId)) {
    return NextResponse.json({ ok: false, error: "complete.err.id" }, { status: 400 });
  }
  if (address && !isValidOpenAddress(address)) {
    return NextResponse.json({ ok: false, error: "complete.err.address" }, { status: 400 });
  }

  const oldPhone = auth.user.profile.phone;
  const merged = stampVerification({
    ...auth.user.profile,
    fullName: fullName || auth.user.profile.fullName,
    phone: phone || auth.user.profile.phone,
    birthDate: birthDate || auth.user.profile.birthDate,
    nationalId: nationalId || auth.user.profile.nationalId,
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
