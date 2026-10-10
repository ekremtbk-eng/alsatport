import { NextResponse } from "next/server";
import { VEHICLE_REQUEST_STATUSES, type VehicleRequestStatus } from "@/data/vehicleRequests";
import { requireAdmin } from "@/lib/security/session";
import { adminListVehicleRequests } from "@/lib/vehicleRequests/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const raw = new URL(req.url).searchParams.get("status") ?? "pending";
  const status: VehicleRequestStatus | "all" =
    raw === "all" || (VEHICLE_REQUEST_STATUSES as readonly string[]).includes(raw) ? (raw as VehicleRequestStatus | "all") : "pending";
  return NextResponse.json({ ok: true, requests: await adminListVehicleRequests(status) });
}
