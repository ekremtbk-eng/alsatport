import { NextResponse } from "next/server";
import { claimsFromCookies } from "@/lib/security/session";
import { findUserById } from "@/lib/security/userStore";
import { findActiveSpecialDay, toPublicSpecialDay } from "@/lib/specialDays";

export async function GET() {
  const { today, row } = await findActiveSpecialDay();
  if (!row) {
    return NextResponse.json(
      { ok: true, day: null, dateKey: today.key },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  }
  const claims = await claimsFromCookies();
  const user = claims ? await findUserById(claims.sub) : null;
  return NextResponse.json(
    {
      ok: true,
      dateKey: today.key,
      day: toPublicSpecialDay(row, today, user),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
