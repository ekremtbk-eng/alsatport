import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/security/session";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  const rows = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
            { profile: { is: { displayName: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {},
    include: { profile: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    ok: true,
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      bannedAt: u.bannedAt?.toISOString() ?? null,
      displayName: u.profile?.displayName ?? u.username,
      businessName: u.profile?.businessName ?? null,
      businessVerifiedAt: u.profile?.businessVerifiedAt?.toISOString() ?? null,
    })),
  });
}
