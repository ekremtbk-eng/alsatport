import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sweepListings } from "@/lib/listings/lifecycle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; without a configured secret the job stays closed. */
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = req.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await sweepListings();
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
