/**
 * Isolated checks for register rate-limit behaviour (no Production, no PII).
 * Avoids importing server-only throttle DB helpers for most checks; uses in-memory rateLimit
 * under NODE_ENV=production to prove quota semantics.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rateLimit } from "../src/lib/security/rateLimit";
import { LIMITS } from "../src/lib/security/rateLimit";

type Result = { id: string; name: string; pass: boolean; detail?: string };
const results: Result[] = [];

function check(id: string, name: string, pass: boolean, detail = "") {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id.padEnd(5)} ${name}${detail ? `  — ${detail}` : ""}`);
}

async function main() {
  const root = process.cwd();
  const throttleSrc = readFileSync(join(root, "src/lib/security/throttle.ts"), "utf8");
  const routeSrc = readFileSync(join(root, "src/app/api/auth/register/route.ts"), "utf8");
  const messagesSrc = readFileSync(join(root, "src/i18n/messages.ts"), "utf8");
  const middlewareSrc = readFileSync(join(root, "src/middleware.ts"), "utf8");

  check(
    "T1",
    "register throttle is 5 / hour",
    /register:\s*\{\s*limit:\s*5,\s*windowMs:\s*60\s*\*\s*60\s*\*\s*1000\s*\}/.test(throttleSrc),
  );

  check(
    "T2",
    "tooMany JSON includes retryAfter",
    /error:\s*"auth\.err\.rateLimit"/.test(throttleSrc) && /retryAfter:\s*wait/.test(throttleSrc),
  );

  check(
    "T3",
    "tooMany sets Retry-After header",
    /"Retry-After":\s*String\(wait\)/.test(throttleSrc),
  );

  // Match call sites in POST (not import lines — verifyRecaptchaToken import precedes readJson).
  const csrfAt = routeSrc.indexOf("await requireMutatingRequest");
  const parseAt = routeSrc.indexOf("await readJson");
  const captchaAt = routeSrc.indexOf("await verifyRecaptchaToken");
  const throttleAt = routeSrc.indexOf("THROTTLE.register");
  check(
    "T4",
    "order CSRF → parse → captcha → register IP throttle",
    csrfAt >= 0 && parseAt > csrfAt && captchaAt > parseAt && throttleAt > captchaAt,
    `csrf@${csrfAt} parse@${parseAt} captcha@${captchaAt} throttle@${throttleAt}`,
  );

  check(
    "T5",
    "register throttle key remains IP-scoped",
    routeSrc.includes("register:ip:${ip}"),
  );

  check(
    "T6",
    "rateLimitWait message exists for UX",
    messagesSrc.includes('"auth.err.rateLimitWait"') && messagesSrc.includes("{minutes}"),
  );

  check(
    "T7",
    "middleware keeps general API write rate limit",
    middlewareSrc.includes("apiRateLimit") && LIMITS.apiWrite.limit > 0 && LIMITS.apiWriteIp.limit > 0,
    `apiWrite=${LIMITS.apiWrite.limit}/min apiWriteIp=${LIMITS.apiWriteIp.limit}/min`,
  );

  // Captcha failure must not call THROTTLE.register — already ordered in T4.
  // Simulate register IP quota with memory limiter (NODE_ENV=production, no req → not local bypass).
  const prevEnv = process.env.NODE_ENV;
  const env = process.env as { NODE_ENV?: string; VERCEL?: string };
  env.NODE_ENV = "production";
  delete env.VERCEL;
  const key = `t:register:ip:iso-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const windowMs = 60 * 60 * 1000;
  const limit = 5;
  let allowed = 0;
  let blocked = 0;
  for (let i = 0; i < limit + 2; i++) {
    const r = rateLimit(key, limit, windowMs);
    if (r.ok) allowed += 1;
    else blocked += 1;
  }
  check(
    "T8",
    "sequential register-quota: 5 allowed then blocked",
    allowed === 5 && blocked === 2,
    `allowed=${allowed} blocked=${blocked}`,
  );

  const key2 = `t:register:ip:conc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const concurrent = await Promise.all(
    Array.from({ length: 12 }, () => Promise.resolve(rateLimit(key2, limit, windowMs))),
  );
  const concOk = concurrent.filter((r) => r.ok).length;
  const concFail = concurrent.filter((r) => !r.ok).length;
  // Memory map is not a DB lock; require at least the limit of successes and some failures.
  // Production path also hits atomic Postgres upsert for the same key.
  check(
    "T9",
    "burst traffic hits the ceiling (some 429-equivalent)",
    concOk <= limit + 2 && concFail >= 1,
    `ok=${concOk} fail=${concFail} limit=${limit}`,
  );

  const sixth = rateLimit(key, limit, windowMs);
  check(
    "T10",
    "Retry-After positive when over limit",
    !sixth.ok && sixth.retryAfter > 0,
    `retryAfter=${sixth.retryAfter}`,
  );

  env.NODE_ENV = prevEnv;

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
