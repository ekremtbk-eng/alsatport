import { NextResponse } from "next/server";
import { findStoreContact } from "@/lib/business/store";
import { formatBusinessPhone } from "@/lib/business/shared";
import { requireUser } from "@/lib/security/session";
import { THROTTLE, throttle, tooMany } from "@/lib/security/throttle";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

/** Store phone / e-mail are shown to signed-in members only, like listing phone numbers. */
export async function GET(req: Request, ctx: Ctx) {
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const limited = await throttle([{ key: `store-contact:${auth.user.id}`, ...THROTTLE.phoneReveal }], req);
  if (!limited.ok) return tooMany(limited.retryAfter);
  const { slug } = await ctx.params;
  const contact = await findStoreContact(slug);
  if (!contact) return NextResponse.json({ ok: false, error: "biz.err.none" }, { status: 404 });
  return NextResponse.json({ ok: true, phone: formatBusinessPhone(contact.phone), email: contact.email });
}
