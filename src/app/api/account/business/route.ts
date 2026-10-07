import { NextResponse } from "next/server";
import { findOwnBusiness, ownerStats, submitApplication, toOwnerView, updateStoreProfile } from "@/lib/business/store";
import { writeAudit } from "@/lib/admin/audit";
import { readJson } from "@/lib/security/parseBody";
import { LIMITS, clientIp } from "@/lib/security/rateLimit";
import { businessApplySchema, businessProfilePatchSchema } from "@/lib/security/schemas";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { throttle, tooMany } from "@/lib/security/throttle";

export const runtime = "nodejs";

async function limited(req: Request, userId: string) {
  const res = await throttle([{ key: `business:${userId}`, ...LIMITS.profile }], req);
  return res.ok ? null : tooMany(res.retryAfter);
}

export async function GET() {
  const auth = await requireUser("member", { allowUnverified: true });
  if ("error" in auth) return auth.error;
  const row = await findOwnBusiness(auth.user.id);
  if (!row) return NextResponse.json({ ok: true, business: null });
  const stats = row.status === "approved" ? await ownerStats(auth.user.id) : undefined;
  return NextResponse.json({ ok: true, business: toOwnerView(row, stats) });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const slow = await limited(req, auth.user.id);
  if (slow) return slow;
  const parsed = await readJson(req, businessApplySchema);
  if (!parsed.ok) return parsed.response;
  const result = await submitApplication(auth.user.id, parsed.data);
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  await writeAudit({
    actorId: auth.user.id,
    action: "business.apply",
    entityType: "business",
    entityId: result.row.id,
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  });
  return NextResponse.json({ ok: true, business: toOwnerView(result.row) });
}

export async function PATCH(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const slow = await limited(req, auth.user.id);
  if (slow) return slow;
  const parsed = await readJson(req, businessProfilePatchSchema);
  if (!parsed.ok) return parsed.response;
  const result = await updateStoreProfile(auth.user.id, parsed.data);
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, business: toOwnerView(result.row, await ownerStats(auth.user.id)) });
}
