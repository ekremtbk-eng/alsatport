import "server-only";
import { prisma } from "@/lib/db";
import { SPECIAL_DAY_SEEDS } from "@/data/specialDays";

const DAY_MS = 86_400_000;

export type IstanbulDate = { y: number; m: number; d: number; key: string };

export type PublicSpecialDay = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  theme: string;
  eyebrow: string;
  title: string;
  body: string;
  closing: string;
  cta: string;
  dateKey: string;
};

export function istanbulDate(now = new Date()): IstanbulDate {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const pick = (t: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  const y = pick("year");
  const m = pick("month");
  const d = pick("day");
  return { y, m, d, key: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

export function isSpecialDayActive(
  row: { month: number; day: number; year: number | null; durationDays: number },
  today: IstanbulDate,
) {
  const duration = Math.max(1, Math.min(40, row.durationDays || 1));
  const startY = row.year ?? today.y;
  const start = Date.UTC(startY, row.month - 1, row.day);
  const end = start + duration * DAY_MS;
  const t = Date.UTC(today.y, today.m - 1, today.d);
  return t >= start && t < end;
}

export function fillSpecialDayCopy(
  text: string,
  ctx: { year: number; name?: string; firstName?: string },
) {
  const first = (ctx.firstName || ctx.name || "dostumuz").trim() || "dostumuz";
  const republicAge = ctx.year - 1923;
  return text
    .replaceAll("{{year}}", String(ctx.year))
    .replaceAll("{{name}}", ctx.name?.trim() || first)
    .replaceAll("{{firstName}}", first)
    .replaceAll("{{republicAge}}", String(republicAge));
}

export function toPublicSpecialDay(
  row: {
    id: string;
    slug: string;
    name: string;
    kind: string;
    theme: string;
    eyebrow: string;
    title: string;
    body: string;
    closing: string;
    cta: string;
  },
  today: IstanbulDate,
  viewer?: { displayName?: string | null; username?: string | null } | null,
): PublicSpecialDay {
  const name = viewer?.displayName?.trim() || viewer?.username?.trim() || "";
  const firstName = name.split(/\s+/)[0] || name;
  const ctx = { year: today.y, name, firstName };
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    theme: row.theme,
    eyebrow: fillSpecialDayCopy(row.eyebrow, ctx),
    title: fillSpecialDayCopy(row.title, ctx),
    body: fillSpecialDayCopy(row.body, ctx),
    closing: fillSpecialDayCopy(row.closing, ctx),
    cta: fillSpecialDayCopy(row.cta, ctx),
    dateKey: today.key,
  };
}

export async function seedSpecialDays() {
  for (const row of SPECIAL_DAY_SEEDS) {
    await prisma.specialDay.upsert({
      where: { slug: row.slug },
      create: {
        slug: row.slug,
        name: row.name,
        kind: row.kind,
        month: row.month,
        day: row.day,
        year: row.year ?? null,
        durationDays: row.durationDays,
        active: row.active,
        sortOrder: row.sortOrder,
        theme: row.theme,
        eyebrow: row.eyebrow,
        title: row.title,
        body: row.body,
        closing: row.closing,
        cta: row.cta,
      },
      update: {},
    });
  }
}

export async function findActiveSpecialDay(now = new Date()) {
  const today = istanbulDate(now);
  const rows = await prisma.specialDay.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "desc" }, { createdAt: "asc" }],
  });
  const hit = rows.find((row) => isSpecialDayActive(row, today));
  return { today, row: hit ?? null };
}
