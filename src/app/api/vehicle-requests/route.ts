import { NextResponse } from "next/server";
import { readJson } from "@/lib/security/parseBody";
import { LIMITS, clientIp, clientRateKey, rateLimit } from "@/lib/security/rateLimit";
import { vehicleRequestBodySchema } from "@/lib/security/schemas";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { approvedVehicles, createVehicleRequest } from "@/lib/vehicleRequests/store";

export const runtime = "nodejs";

/** Admin-approved additions only; pending or rejected requests never leave the server. */
export async function GET(req: Request) {
  const limited = rateLimit(clientRateKey(req, "vehicle-approved"), LIMITS.apiRead.limit, LIMITS.apiRead.windowMs, req);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  return NextResponse.json(
    { ok: true, vehicles: await approvedVehicles() },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("member");
  if ("error" in auth) return auth.error;
  const limited = rateLimit(`vehicle-request:${clientIp(req)}:${auth.user.id}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "auth.err.rateLimit" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }
  const parsed = await readJson(req, vehicleRequestBodySchema);
  if (!parsed.ok) return parsed.response;
  const result = await createVehicleRequest(auth.user.id, parsed.data);
  if ("error" in result) return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
