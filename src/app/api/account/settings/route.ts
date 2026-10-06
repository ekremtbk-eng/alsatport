import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/security/parseBody";
import { LIMITS, clientIp, rateLimit } from "@/lib/security/rateLimit";
import { accountSettingsSchema } from "@/lib/security/schemas";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { findUserById } from "@/lib/security/userStore";

export async function PATCH(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;

  const limited = rateLimit(`settings:${clientIp(req)}:${auth.user.id}`, LIMITS.apiWrite.limit, LIMITS.apiWrite.windowMs);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const parsed = await readJson(req, accountSettingsSchema);
  if (!parsed.ok) return parsed.response;
  const { readReceipts, marketingEmail, marketingSms, marketingPush } = parsed.data;
  const marketingTouched = marketingEmail !== undefined || marketingSms !== undefined || marketingPush !== undefined;
  await prisma.profile.update({
    where: { userId: auth.user.id },
    data: {
      ...(readReceipts !== undefined ? { readReceipts } : {}),
      ...(marketingEmail !== undefined ? { marketingEmail } : {}),
      ...(marketingSms !== undefined ? { marketingSms } : {}),
      ...(marketingPush !== undefined ? { marketingPush } : {}),
      ...(marketingTouched ? { marketingUpdatedAt: new Date() } : {}),
    },
  });
  const user = (await findUserById(auth.user.id))!;
  return NextResponse.json({ ok: true, user: user.profile });
}
