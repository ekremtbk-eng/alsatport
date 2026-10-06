import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { isUuid } from "@/lib/ids";
import { requireMutatingRequest, requireUser } from "@/lib/security/session";
import { specialDayBodySchema } from "@/lib/security/schemas";
import { sanitizeMultiline, sanitizeText } from "@/lib/security/sanitize";
import { isSpecialDayActive, istanbulDate } from "@/lib/specialDays";

type Ctx = { params: Promise<{ id: string }> };

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
  return { ...row, live: row.active && isSpecialDayActive(row, istanbulDate()) };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("admin");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const parsed = specialDayBodySchema.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  }
  const d = parsed.data;
  const existing = await prisma.specialDay.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  try {
    const row = await prisma.specialDay.update({
      where: { id },
      data: {
        ...(d.slug ? { slug: d.slug } : {}),
        ...(d.name ? { name: sanitizeText(d.name, 120) } : {}),
        ...(d.kind ? { kind: d.kind } : {}),
        ...(d.month != null ? { month: d.month } : {}),
        ...(d.day != null ? { day: d.day } : {}),
        ...(d.year !== undefined ? { year: d.year ?? null } : {}),
        ...(d.durationDays != null ? { durationDays: d.durationDays } : {}),
        ...(d.active != null ? { active: d.active } : {}),
        ...(d.sortOrder != null ? { sortOrder: d.sortOrder } : {}),
        ...(d.theme ? { theme: d.theme } : {}),
        ...(d.eyebrow ? { eyebrow: sanitizeText(d.eyebrow, 160) } : {}),
        ...(d.title ? { title: sanitizeText(d.title, 200) } : {}),
        ...(d.body ? { body: sanitizeMultiline(d.body, 2000) } : {}),
        ...(d.closing ? { closing: sanitizeText(d.closing, 240) } : {}),
        ...(d.cta ? { cta: sanitizeText(d.cta, 80) } : {}),
      },
    });
    await writeAudit({
      actorId: auth.user.id,
      action: "special_day.update",
      entityType: "special_day",
      entityId: row.id,
      payload: { slug: row.slug },
    });
    return NextResponse.json({ ok: true, day: serialize(row) });
  } catch {
    return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 409 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  const blocked = await requireMutatingRequest(req);
  if (blocked) return blocked;
  const auth = await requireUser("admin");
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: "auth.err.required" }, { status: 400 });
  const existing = await prisma.specialDay.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ ok: false, error: "auth.err.session" }, { status: 404 });
  await prisma.specialDay.delete({ where: { id } });
  await writeAudit({
    actorId: auth.user.id,
    action: "special_day.delete",
    entityType: "special_day",
    entityId: id,
    payload: { slug: existing.slug },
  });
  return NextResponse.json({ ok: true });
}
