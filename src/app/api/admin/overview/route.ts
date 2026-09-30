import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/security/session";

export async function GET() {
  const auth = await requireUser("admin");
  if ("error" in auth) return auth.error;
  const [pending, openReports, users, banned] = await Promise.all([
    prisma.listing.count({ where: { deletedAt: null, status: "pending" } }),
    prisma.report.count({ where: { status: { in: ["open", "reviewing"] } } }),
    prisma.user.count(),
    prisma.user.count({ where: { bannedAt: { not: null } } }),
  ]);
  return NextResponse.json({ ok: true, pending, openReports, users, banned });
}
