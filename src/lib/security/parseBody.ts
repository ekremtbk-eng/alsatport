import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export function zodFail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function firstZodMessage(err: { issues: { message: string }[] }) {
  const msg = err.issues[0]?.message;
  if (msg && !msg.startsWith("Invalid") && msg.includes(".")) return msg;
  return "auth.err.required";
}

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const raw = await req.json().catch(() => null);
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, response: zodFail("auth.err.required") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: zodFail(firstZodMessage(parsed.error)) };
  }
  return { ok: true, data: parsed.data };
}

export function parseSearch<T>(url: URL, schema: ZodType<T>): T | null {
  const obj = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(obj);
  return parsed.success ? parsed.data : null;
}
