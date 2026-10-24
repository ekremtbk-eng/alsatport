import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/security/parseBody";
import { LIMITS, clientIp } from "@/lib/security/rateLimit";
import { throttle, tooMany } from "@/lib/security/throttle";
import { accountSettingsSchema } from "@/lib/security/schemas";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { findUserById } from "@/lib/security/userStore";
import { recordMarketingChoice } from "@/lib/privacy/consents";

export async function PATCH(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;

  const limited = await throttle([{ key: `settings:${clientIp(req)}:${auth.user.id}`, ...LIMITS.apiWrite }], req);
  if (!limited.ok) return tooMany(limited.retryAfter);

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
  if (marketingEmail !== undefined) {
    await recordMarketingChoice(auth.user.id, "email", marketingEmail, "settings");
  }
  if (marketingSms !== undefined) {
    await recordMarketingChoice(auth.user.id, "sms", marketingSms, "settings");
  }
  const user = (await findUserById(auth.user.id))!;
  return NextResponse.json({ ok: true, user: user.profile });
}
