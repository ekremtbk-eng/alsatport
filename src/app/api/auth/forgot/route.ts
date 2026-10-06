import { NextResponse, after } from "next/server";
import { sendPasswordResetEmail, sendSocialOnlyResetEmail } from "@/lib/mail/authMail";
import { outboundMailReady } from "@/lib/mail/config";
import { RESET_TTL_MINUTES, signPasswordResetToken } from "@/lib/security/passwordReset";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { requireMutatingRequest } from "@/lib/security/session";
import { findUserById, findUserByIdentifier, type StoredUser } from "@/lib/security/userStore";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/security/parseBody";
import { forgotBodySchema } from "@/lib/security/schemas";

export const maxDuration = 60;

const PER_ADDRESS = { limit: 3, windowMs: 15 * 60 * 1000 };

async function resolveTarget(email: string): Promise<{ user: StoredUser; to: string } | null> {
  const user = await findUserByIdentifier(email);
  if (user) return { user, to: user.email };
  const viaRecovery = await prisma.profile.findFirst({
    where: { recoveryEmail: { equals: email, mode: "insensitive" }, recoveryEmailVerifiedAt: { not: null } },
    select: { userId: true },
  });
  const owner = viaRecovery ? await findUserById(viaRecovery.userId) : undefined;
  return owner ? { user: owner, to: email } : null;
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const ip = clientIp(req);
  const limited = rateLimit(`forgot:${ip}`, LIMITS.forgot.limit, LIMITS.forgot.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const parsed = await readJson(req, forgotBodySchema);
  if (!parsed.ok) return parsed.response;
  if (process.env.NODE_ENV === "production" && !outboundMailReady()) {
    return NextResponse.json({ ok: false, error: "auth.err.mail" }, { status: 503 });
  }
  const email = parsed.data.email;
  if (!rateLimit(`forgot-addr:${email.toLowerCase()}`, PER_ADDRESS.limit, PER_ADDRESS.windowMs).ok) {
    return NextResponse.json({ ok: true });
  }
  const target = await resolveTarget(email);
  if (target && !target.user.bannedAt) {
    const { user, to } = target;
    after(async () => {
      const sent = user.passwordHash
        ? await sendPasswordResetEmail(to, await signPasswordResetToken(user.id, user.passwordHash), RESET_TTL_MINUTES)
        : await sendSocialOnlyResetEmail(to, user.provider);
      if (!sent.ok) console.error("[forgot] reset mail not delivered");
    });
  }
  return NextResponse.json({ ok: true });
}
