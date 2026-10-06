import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdmin, requireMutatingRequest } from "@/lib/security/session";
import { specialDayBodySchema } from "@/lib/security/schemas";
import { sanitizeMultiline, sanitizeText } from "@/lib/security/sanitize";
import { findActiveSpecialDay, isSpecialDayActive, istanbulDate } from "@/lib/specialDays";

function serialize(row: {
  id: string;
  slug: string;
  name: string;
  kind: string;
  month: number;
  day: number;
  year: number | null;
  durationDays: number;
  active: boolean;
  sortOrder: number;
  theme: string;
  eyebrow: string;
  title: string;
  body: string;
  closing: string;
  cta: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const today = istanbulDate();
  return {
    ...row,
    live: row.active && isSpecialDayActive(row, today),
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const today = istanbulDate();
  const live = await findActiveSpecialDay();
  const rows = await prisma.specialDay.findMany({
    orderBy: [{ sortOrder: "desc" }, { month: "asc" }, { day: "asc" }],
  });
  return NextResponse.json({
    ok: true,
    dateKey: today.key,
    liveId: live.row?.id ?? null,
    days: rows.map(serialize),
  });
}

export async function POST(req: Request) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = specialDayBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  const d = parsed.data;
  try {
    const row = await prisma.specialDay.create({
      data: {
        slug: d.slug,
        name: sanitizeText(d.name, 120),
        kind: d.kind,
        month: d.month,
        day: d.day,
        year: d.year ?? null,
        durationDays: d.durationDays ?? 1,
        active: d.active ?? true,
        sortOrder: d.sortOrder ?? 0,
        theme: d.theme ?? d.kind,
        eyebrow: sanitizeText(d.eyebrow, 160),
        title: sanitizeText(d.title, 200),
        body: sanitizeMultiline(d.body, 2000),
        closing: sanitizeText(d.closing, 240),
        cta: sanitizeText(d.cta ?? "Teşekkürler", 80),
      },
    });
    await writeAudit({
      actorId: auth.user.id,
      action: "special_day.create",
      entityType: "special_day",
      entityId: row.id,
      payload: { slug: row.slug },
    });
    return NextResponse.json({ ok: true, day: serialize(row) });
  } catch {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 409 });
  }
}
