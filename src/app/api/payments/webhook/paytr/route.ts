import { NextResponse } from "next/server";
import { applyPaytrResult } from "@/lib/payments/store";
import { verifyPaytrCallback } from "@/lib/payments/paytr";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const merchantOid = String(form?.get("merchant_oid") ?? "");
  const status = String(form?.get("status") ?? "");
  const totalAmount = String(form?.get("total_amount") ?? "");
  const hash = String(form?.get("hash") ?? "");
  if (!merchantOid || !hash || !verifyPaytrCallback({ merchantOid, status, totalAmount, hash })) {
    return new NextResponse("FAIL", { status: 400, headers: { "Content-Type": "text/plain" } });
  }
  const paymentAmount = String(form?.get("payment_amount") ?? "");
  const applied = await applyPaytrResult(merchantOid, status, totalAmount, paymentAmount);
  if (!applied.ok) {
    return new NextResponse("FAIL", { status: 404, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("OK", { headers: { "Content-Type": "text/plain" } });
}
