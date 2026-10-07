import { foldText } from "@/lib/smartSearch/normalize";

export const SMART_QUERY_MAX = 200;

/**
 * Requests aimed at the system rather than at listings. Matched on folded text, so Turkish letters,
 * case and punctuation tricks do not bypass it; anything matching is refused before parsing or any AI call.
 */
const BLOCKED: RegExp[] = [
  /\b(system|sistem)\s*(prompt|promptu|promptunu|mesaji|talimat)/,
  /\bprompt(u|unu|un)?\b/,
  /\b(ignore|disregard|forget|override)\b.*\b(previous|above|prior|all|instruction|instructions|rules)\b/,
  /\b(onceki|yukaridaki|tum)\s+(talimat|komut|kural)/,
  /\btalimat(lari|larini|i|ini)?\s*(unut|yoksay|gormezden)/,
  /\b(jailbreak|dan mode|developer mode|act as|you are now|roleplay|pretend)\b/,
  /\.\s*env\b|\benv\s*(dosya|file|degisken|variable)|\bdotenv\b/,
  /\b(database|db|redis|postgres|neon|blob|smtp|resend|vercel|openai|anthropic)[_ ]?(url|token|key|secret|sifre|password)\b/,
  /\b(api|access|secret|private|session|auth|bearer|jwt|csrf|refresh)\s*(key|keys|keyleri|keylerini|anahtar|token|tokeni|tokenimi|tokenlari|secret)\b/,
  /\b(cookie|cerez)(ler|leri|lerimi|imi|i)?\b/,
  /\b(password|parola|sifre|sifreler|sifreleri|otp|2fa|totp)\b/,
  /\b(select|insert|update|delete|drop|truncate|union|alter)\b.*\b(from|into|table|set|where|database)\b/,
  /\b(sql|prisma|query|sorgu)\s*(calistir|run|execute|yaz)/,
  /\b(admin|yonetici|moderator)(ler|leri|lerin|lari|lerini)?\b.*\b(liste|listele|goster|ver|getir|kimler|bilgi)/,
  /\b(kullanici|uye|user|users|musteri)(lar|lari|larin|ların|larinin)?\b.*\b(email|e posta|eposta|mail|telefon|adres|liste|listele|getir|goster|bilgi|ver)/,
  /\b(email|e posta|eposta|mail)(ler|leri|lerini|lerin)?\b.*\b(getir|goster|ver|listele|liste)/,
  /\b(tc|kimlik|iban|kredi karti)\s*(no|numara)/,
  /\.\.\s*\/|\.\.\\|\/etc\/|c:\\/i,
  /__proto__|\bconstructor\b|\bprototype\b/,
  /<\s*script|javascript:|\beval\s*\(|\$\{|\{\{/,
  /\b(kaynak kod|source code|konfigurasyon dosya|server log|sunucu log)\b/,
];

/** Raw-text checks for markup that folding would erase. */
const RAW_BLOCKED: RegExp[] = [/__proto__/i, /\.\.[/\\]/, /[<>{}`\\]/, /\$\{/];

const URL_LIKE = /(https?:\/\/|www\.)/i;

export type GuardResult = { ok: true; text: string } | { ok: false; reason: "empty" | "length" | "blocked" };

export function guardSmartQuery(raw: unknown): GuardResult {
  if (typeof raw !== "string") return { ok: false, reason: "empty" };
  const trimmed = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  if (trimmed.length > SMART_QUERY_MAX) return { ok: false, reason: "length" };
  if (RAW_BLOCKED.some((re) => re.test(trimmed)) || URL_LIKE.test(trimmed)) return { ok: false, reason: "blocked" };
  const folded = foldText(trimmed);
  if (!folded) return { ok: false, reason: "empty" };
  if (BLOCKED.some((re) => re.test(folded) || re.test(trimmed.toLowerCase()))) return { ok: false, reason: "blocked" };
  return { ok: true, text: trimmed };
}
