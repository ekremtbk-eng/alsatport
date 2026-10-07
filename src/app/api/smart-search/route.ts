import { NextResponse } from "next/server";
import { z } from "zod";
import { originAllowed } from "@/lib/security/csrf";
import { clientIp, clientRateKey, rateLimit } from "@/lib/security/rateLimit";
import { throttle } from "@/lib/security/throttle";
import { sanitizeSearchQuery } from "@/lib/security/inputGuard";
import { claimsFromCookies } from "@/lib/security/session";
import { queryListings } from "@/lib/listings/store";
import { commonFilterFields, filterFieldsForCategory, listingMatchesDynamicFilters, type FilterState } from "@/lib/categoryFilters";
import type { Category } from "@/data/categories";
import { SMART_QUERY_MAX, guardSmartQuery } from "@/lib/smartSearch/guard";
import { foldText } from "@/lib/smartSearch/normalize";
import { SMART_HINTS, isChatty, parseSmartQuery, smartChips, smartResultsHref, type SmartHint } from "@/lib/smartSearch/parse";
import { aiConfigured, aiRewriteQuery } from "@/lib/smartSearch/ai";

export const dynamic = "force-dynamic";

const MAX_BODY = 2048;
const CACHE_TTL_MS = 2 * 60 * 1000;
const CACHE_MAX = 300;

const bodySchema = z
  .object({
    q: z.string().max(SMART_QUERY_MAX * 2),
    hint: z.enum(Object.keys(SMART_HINTS) as [SmartHint, ...SmartHint[]]).optional(),
  })
  .strict();

type Body =
  | { ok: true; kind: "results"; engine: "rules" | "ai"; url: string; count: number; chips: ReturnType<typeof smartChips> }
  | { ok: false; kind: "refused" | "unavailable" | "invalid" | "rate" };

const g = globalThis as unknown as { __apSmartCache?: Map<string, { at: number; body: Body }> };
const cache = g.__apSmartCache ?? new Map<string, { at: number; body: Body }>();
g.__apSmartCache = cache;

const NO_STORE = { "Cache-Control": "no-store" };

function reply(body: Body, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function cached(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.body;
}

function remember(key: string, body: Body) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), body });
}

async function countResults(category: Category | null, state: FilterState, keyword: string) {
  const priceMin = Number(state.priceMin);
  const priceMax = Number(state.priceMax);
  const rows = await queryListings({
    q: keyword || undefined,
    categoryId: category?.id,
    city: state.city,
    district: state.district,
    priceMin: state.priceMin && Number.isFinite(priceMin) ? priceMin : undefined,
    priceMax: state.priceMax && Number.isFinite(priceMax) ? priceMax : undefined,
  });
  const fields = category ? filterFieldsForCategory(category) : commonFilterFields();
  return rows.filter((l) => listingMatchesDynamicFilters(l, state, fields)).length;
}

export async function POST(req: Request) {
  if (!originAllowed(req)) return reply({ ok: false, kind: "invalid" }, 403);
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY) return reply({ ok: false, kind: "invalid" }, 413);
  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY) return reply({ ok: false, kind: "invalid" }, 413);
  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    return reply({ ok: false, kind: "invalid" }, 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return reply({ ok: false, kind: "invalid" }, 400);

  const claims = await claimsFromCookies().catch(() => null);
  const who = claims?.sub ? `u:${claims.sub}` : clientRateKey(req, "d");
  const limited = await throttle(
    [
      { key: `smart:ip:${clientIp(req)}`, limit: 30, windowMs: 10 * 60 * 1000 },
      { key: `smart:who:${who}`, limit: 20, windowMs: 10 * 60 * 1000 },
    ],
    req,
  );
  if (!limited.ok) return reply({ ok: false, kind: "rate" }, 429, { "Retry-After": String(limited.retryAfter) });

  const guarded = guardSmartQuery(parsed.data.q);
  if (!guarded.ok) {
    return guarded.reason === "blocked" ? reply({ ok: false, kind: "refused" }) : reply({ ok: false, kind: "invalid" }, 400);
  }
  const text = guarded.text;
  const hint = parsed.data.hint;
  const key = `${hint ?? ""}|${foldText(text)}`;
  const hit = cached(key);
  if (hit) return reply(hit);

  try {
    let result = parseSmartQuery(text, hint);
    if (isChatty(text, !!result.category)) {
      const body: Body = { ok: false, kind: "refused" };
      remember(key, body);
      return reply(body);
    }
    let engine: "rules" | "ai" = "rules";
    if (!result.category && aiConfigured() && rateLimit(`smart-ai:${clientIp(req)}`, 10, 10 * 60 * 1000, req).ok) {
      const ai = await aiRewriteQuery(text);
      if (ai && !ai.search) {
        const body: Body = { ok: false, kind: "refused" };
        remember(key, body);
        return reply(body);
      }
      if (ai?.search) {
        const again = parseSmartQuery(`${text} ${ai.terms.join(" ")}`, hint);
        if (again.category) {
          result = { ...again, keyword: "" };
          engine = "ai";
        }
      }
    }
    const keyword = result.category ? "" : sanitizeSearchQuery(result.keyword, 60);
    if (!result.category && !keyword && !result.state.city) {
      const body: Body = { ok: false, kind: "refused" };
      remember(key, body);
      return reply(body);
    }
    const count = await countResults(result.category, result.state, keyword);
    const body: Body = {
      ok: true,
      kind: "results",
      engine,
      url: smartResultsHref(result.category, result.state, keyword),
      count,
      chips: smartChips(result.category, result.state, keyword),
    };
    remember(key, body);
    return reply(body);
  } catch {
    return reply({ ok: false, kind: "unavailable" }, 503);
  }
}
