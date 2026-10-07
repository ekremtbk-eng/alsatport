import { NextResponse } from "next/server";
import { adminListBusinesses } from "@/lib/business/store";
import { BUSINESS_STATUSES, type BusinessStatusId } from "@/lib/business/shared";
import { requireAdmin } from "@/lib/security/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const raw = new URL(req.url).searchParams.get("status") ?? "pending";
  const status: BusinessStatusId | "all" =
    raw === "all" || (BUSINESS_STATUSES as readonly string[]).includes(raw) ? (raw as BusinessStatusId | "all") : "pending";
  return NextResponse.json({ ok: true, businesses: await adminListBusinesses(status) });
}
