import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import { readJson } from "@/lib/security/parseBody";
import { clientIp } from "@/lib/security/rateLimit";
import { adminVehicleRequestActionSchema } from "@/lib/security/schemas";
import { requireAdmin, requireMutatingRequest } from "@/lib/security/session";
import { adminVehicleRequestAction } from "@/lib/vehicleRequests/store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireAdmin({ stepUp: true });
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const parsed = await readJson(req, adminVehicleRequestActionSchema);
  if (!parsed.ok) return parsed.response;
  const { action, reason } = parsed.data;
  const result = await adminVehicleRequestAction(auth.user.id, id, action, reason);
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  await writeAudit({
    actorId: auth.user.id,
    action: `vehicle_request.${action}`,
    entityType: "vehicle_request",
    entityId: id,
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
    payload: { previous: result.previous, next: result.next, requester: result.userId, reason: reason || undefined },
  });
  return NextResponse.json({ ok: true, state: result.next });
}
