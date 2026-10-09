import { districtsOf } from "@/data/turkey";
import { sanitizeMultiline, sanitizeText } from "@/lib/security/sanitize";

/** ISO weekday: 1 = Monday … 7 = Sunday. A day missing from `days` is a closed day. */
export type FirmDayHours = { day: number; open: string; close: string };
export type FirmHours = { always: true } | { always: false; days: FirmDayHours[] };
export type FirmPriceItem = { title: string; min: number; max?: number; unit?: string };
export type FirmAnnouncement = { text: string; at: number };
export type FirmFaqItem = { q: string; a: string };

export type FirmExtras = {
  hours: FirmHours | null;
  serviceDistricts: string[];
  priceList: FirmPriceItem[];
  announcements: FirmAnnouncement[];
  faq: FirmFaqItem[];
};

/** Public service profile of an approved business (no tax or private contact data). */
export type PublicFirm = FirmExtras & { slug: string; name: string; description: string; website?: string };

export const FIRM_LIMITS = {
  priceRows: 20,
  priceTitle: 80,
  priceUnit: 30,
  priceMax: 100_000_000,
  announcements: 5,
  announcementText: 300,
  faq: 10,
  question: 160,
  answer: 600,
  districts: 100,
} as const;

export const EMPTY_FIRM_EXTRAS: FirmExtras = { hours: null, serviceDistricts: [], priceList: [], announcements: [], faq: [] };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

type Fail = { error: string };
const fail = (error: string): Fail => ({ error });

export type FirmExtrasInput = Partial<{
  hours: FirmHours | null;
  serviceDistricts: string[];
  priceList: { title: string; min: number; max?: number | null; unit?: string }[];
  announcements: { text: string; at?: number }[];
  faq: FirmFaqItem[];
}>;

function cleanHours(input: FirmHours | null): FirmHours | null | Fail {
  if (!input) return null;
  if (input.always) return { always: true };
  const seen = new Set<number>();
  const days: FirmDayHours[] = [];
  for (const d of input.days) {
    if (!Number.isInteger(d.day) || d.day < 1 || d.day > 7 || seen.has(d.day)) return fail("biz.err.hours");
    if (!TIME.test(d.open) || !TIME.test(d.close) || minutes(d.open) >= minutes(d.close)) return fail("biz.err.hours");
    seen.add(d.day);
    days.push({ day: d.day, open: d.open, close: d.close });
  }
  days.sort((a, b) => a.day - b.day);
  return days.length ? { always: false, days } : null;
}

/**
 * Validates and normalises the owner's service profile fields. Only provided keys are returned.
 * `previous` keeps the original date of an announcement whose text did not change.
 */
export function cleanFirmExtras(
  input: FirmExtrasInput,
  city: string,
  previous: FirmAnnouncement[] = [],
): Partial<FirmExtras> | Fail {
  const out: Partial<FirmExtras> = {};
  if (input.hours !== undefined) {
    const hours = cleanHours(input.hours);
    if (hours && "error" in hours) return hours;
    out.hours = hours;
  }
  if (input.serviceDistricts !== undefined) {
    const allowed = new Set(districtsOf(city));
    const list = [...new Set(input.serviceDistricts.map((d) => sanitizeText(d, 40)).filter(Boolean))];
    if (list.length > FIRM_LIMITS.districts || list.some((d) => !allowed.has(d))) return fail("biz.err.districts");
    out.serviceDistricts = list;
  }
  if (input.priceList !== undefined) {
    if (input.priceList.length > FIRM_LIMITS.priceRows) return fail("biz.err.prices");
    const rows: FirmPriceItem[] = [];
    for (const r of input.priceList) {
      const title = sanitizeText(r.title, FIRM_LIMITS.priceTitle);
      const unit = sanitizeText(r.unit ?? "", FIRM_LIMITS.priceUnit);
      const min = Number(r.min);
      const max = r.max == null || (r.max as unknown) === "" ? undefined : Number(r.max);
      if (title.length < 2) return fail("biz.err.prices");
      if (!Number.isFinite(min) || min <= 0 || min > FIRM_LIMITS.priceMax) return fail("biz.err.prices");
      if (max !== undefined && (!Number.isFinite(max) || max < min || max > FIRM_LIMITS.priceMax)) return fail("biz.err.prices");
      rows.push({ title, min: Math.round(min), ...(max !== undefined && max > min ? { max: Math.round(max) } : {}), ...(unit ? { unit } : {}) });
    }
    out.priceList = rows;
  }
  if (input.announcements !== undefined) {
    if (input.announcements.length > FIRM_LIMITS.announcements) return fail("biz.err.announcements");
    const now = Date.now();
    const list: FirmAnnouncement[] = [];
    for (const a of input.announcements) {
      const text = sanitizeMultiline(a.text, FIRM_LIMITS.announcementText);
      if (text.length < 3) return fail("biz.err.announcements");
      list.push({ text, at: previous.find((p) => p.text === text)?.at ?? now });
    }
    out.announcements = list;
  }
  if (input.faq !== undefined) {
    if (input.faq.length > FIRM_LIMITS.faq) return fail("biz.err.faq");
    const list: FirmFaqItem[] = [];
    for (const item of input.faq) {
      const q = sanitizeText(item.q, FIRM_LIMITS.question);
      const a = sanitizeMultiline(item.a, FIRM_LIMITS.answer);
      if (q.length < 5 || a.length < 2) return fail("biz.err.faq");
      list.push({ q, a });
    }
    out.faq = list;
  }
  return out;
}

/** Reads stored JSON defensively: anything malformed is treated as "not provided". */
export function readFirmExtras(row: {
  workingHours: unknown;
  serviceDistricts: string[];
  priceList: unknown;
  announcements: unknown;
  faq: unknown;
}): FirmExtras {
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const hoursRaw = row.workingHours as FirmHours | null;
  let hours: FirmHours | null = null;
  if (hoursRaw && typeof hoursRaw === "object") {
    const cleaned = cleanHours(hoursRaw.always ? { always: true } : { always: false, days: arr((hoursRaw as { days?: unknown }).days) as FirmDayHours[] });
    hours = cleaned && !("error" in cleaned) ? cleaned : null;
  }
  return {
    hours,
    serviceDistricts: row.serviceDistricts.filter((d) => typeof d === "string" && d),
    priceList: arr(row.priceList).filter(
      (r): r is FirmPriceItem => !!r && typeof r.title === "string" && typeof r.min === "number" && r.min > 0,
    ),
    announcements: arr(row.announcements).filter(
      (a): a is FirmAnnouncement => !!a && typeof a.text === "string" && typeof a.at === "number",
    ),
    faq: arr(row.faq).filter((f): f is FirmFaqItem => !!f && typeof f.q === "string" && typeof f.a === "string"),
  };
}

const TR_TZ = "Europe/Istanbul";
const WEEKDAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Weekday and minute-of-day in Turkey time, independent of the viewer's time zone. */
export function istanbulClock(at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TR_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { day: WEEKDAY[get("weekday")] ?? 1, minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** true / false from the owner's own hours; null when no hours were entered (state unknown). */
export function isFirmOpen(hours: FirmHours | null, at = new Date()): boolean | null {
  if (!hours) return null;
  if (hours.always) return true;
  const { day, minute } = istanbulClock(at);
  const today = hours.days.find((d) => d.day === day);
  return !!today && minute >= minutes(today.open) && minute < minutes(today.close);
}
